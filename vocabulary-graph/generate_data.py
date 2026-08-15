import csv, gzip, json, os, re, zipfile
import numpy as np
import nltk
from nltk.corpus import wordnet as legacy_wn
from nltk.corpus import cmudict
from nltk.corpus.reader import WordNetCorpusReader
from nltk.corpus.reader.wordnet import WordNetError

SOURCE = "/tmp/en_full.txt"
DICT_SOURCE = "/tmp/ecdict.csv"
GLOVE_ZIP = "/tmp/glove.2024.wikigiga.100d.zip"
MOBY_SOURCE = os.environ.get("MOBY_SOURCE", "/tmp/wordorbit-moby.txt")
WIKTIONARY_SOURCE = os.environ.get("WIKTIONARY_SOURCE", "/tmp/simple-extract.jsonl.gz")
DATA_DIR = "vocabulary-graph/data"
WORD_COUNT = 50000
NEIGHBOR_COUNT = 40
SEARCH_COUNT = 500
CONFUSION_COUNT = 12
# The concept tree is a learning view, not a complete WordNet browser. Prefer
# names made from roughly the 15k most common words and omit specialist labels.
CONCEPT_MAX_RANK = 15000
CONCEPT_NODE_LIMIT = 18
# Lexical relations may include useful academic/job words (educator, lecturer)
# that rank below the concept-tree cutoff, while still omitting the long tail.
LEXICAL_MAX_RANK = 30000
LEXICAL_NODE_LIMIT = 18
RERANK_VERSION = "ecdict-pos-gloss-v1"
WORDNET_DATA = os.environ.get("WORDNET_DATA", "/tmp/wordorbit-nltk-private")
OEWN_DIR = os.environ.get("OEWN_DIR", "/tmp/wordorbit-oewn2025/oewn2025")
nltk.data.path.insert(0, WORDNET_DATA)
if os.path.isfile(os.path.join(OEWN_DIR,"data.noun")):
  nltk.data.path.insert(0,os.path.dirname(OEWN_DIR))
  wn=WordNetCorpusReader(OEWN_DIR,None)
  WORDNET_LABEL="Open English WordNet 2025"
else:
  wn=legacy_wn
  WORDNET_LABEL="Princeton WordNet"
print(f"using {WORDNET_LABEL}",flush=True)
RELATION_BONUS={"syn":0.14,"ant":0.11,"hyper":0.09,"hypo":0.09,"hyper2":0.05,"hypo2":0.05,"deriv":0.06}
RELATION_PRIORITY={"syn":6,"ant":5,"hyper":4,"hypo":4,"hyper2":3,"hypo2":3,"deriv":2}
SENSITIVE_CONCEPT_ROOTS={"race.n.03"}
BLOCKED_CONCEPT_SYNSETS={
  "master_race.n.01","color.n.04","slavic_people.n.01","indian_race.n.01",
  "white_race.n.01","indian_race.n.02","black_race.n.01","yellow_race.n.01"
}
BLOCKED_CONCEPT_TERMS={"negro","negroid","mongoloid","caucasoid","master_race","yellow_race"}
FUNCTION_GROUPS = {
  "interrogative": {"what","which","who","whom","whose","where","when","why","how","whether"},
  "pronoun": {"i","me","my","mine","you","your","yours","he","him","his","she","her","hers","it","its","we","us","our","ours","they","them","their","theirs","everyone","someone","anyone","nobody"},
  "modal": {"can","could","may","might","must","shall","should","will","would"},
  "determiner": {"a","an","the","this","that","these","those","some","any","each","every","either","neither"},
  "connector": {"and","or","but","if","because","although","while","than","as","of","to","for","with","by","from","at","in","on"},
  "discourse": {"actually","really","perhaps","probably","certainly","simply","just","quite","rather"},
}
FUNCTION_GROUP_BY_WORD={w:g for g,items in FUNCTION_GROUPS.items() for w in items}
POS_MAP={"n":"noun","v":"verb","a":"adj","s":"adj","r":"adv","ad":"adv","adv":"adv","pron":"pron","prep":"prep","conj":"conj","aux":"aux","num":"num","art":"det","int":"interj"}
PLURAL_EXCEPTIONS = {
  "arms","brains","clothes","contents","customs","earnings","goods","glasses",
  "letters","manners","means","minutes","papers","premises","proceeds","quarters",
  "returns","savings","spirits","stairs","surroundings","thanks","works"
}

def is_regular_plural(word, vocabulary):
  if word in PLURAL_EXCEPTIONS or len(word)<4 or word.endswith(("ss","us","is")): return False
  stems=[]
  if word.endswith("ies"): stems.append(word[:-3]+"y")
  if word.endswith("es"): stems.extend((word[:-2],word[:-1]))
  if word.endswith("s"): stems.append(word[:-1])
  return any(stem in vocabulary for stem in stems)

def parse_pos(definition, translation):
  text=(definition or "").replace("\\n","\n")+"\n"+(translation or "")
  found=set()
  for line in text.splitlines():
    m=re.match(r"^\s*([a-z]+)(?:\.|\s)",line.lower())
    if m and m.group(1) in POS_MAP: found.add(POS_MAP[m.group(1)])
  return found

def canonical_form(word, exchange, vocabulary):
  pairs=dict(re.findall(r"(?:^|/)([a-z0-9]+):([^/]*)",exchange or ""))
  lemma=pairs.get("0","").lower()
  if lemma in vocabulary: return lemma
  # ECDICT uses d/i/p/3 for forms but often omits 0 on the headword row.
  return word

def gloss_tokens(definition):
  stop={"a","an","the","and","or","of","to","in","on","for","with","by","from","that","which","who","be","is","are","was","were","being","been","one","someone","something","used","relating","having"}
  return [w for w in re.findall(r"[a-z]+",(definition or "").lower()) if len(w)>2 and w not in stop]

def text_vector(text):
  parts=[vector_by_word[token] for token in gloss_tokens(text) if token in vector_by_word]
  if not parts:return None
  value=np.mean(parts,axis=0)
  norm=np.linalg.norm(value)
  return value/norm if norm>1e-12 else None

def clean_lemma(name):
  word=name.lower().replace("_"," ")
  return word if re.fullmatch(r"[a-z]+",word) else None

def add_relation(relations, target, relation):
  if target and (target not in relations or RELATION_PRIORITY[relation]>RELATION_PRIORITY[relations[target]]):
    relations[target]=relation

def edit_distance(a,b,limit=2):
  if abs(len(a)-len(b))>limit: return limit+1
  previous=list(range(len(b)+1))
  previous_previous=None
  for i,x in enumerate(a,1):
    current=[i]
    row_min=i
    for j,y in enumerate(b,1):
      value=min(current[-1]+1,previous[j]+1,previous[j-1]+(x!=y))
      if previous_previous is not None and i>1 and j>1 and x==b[j-2] and a[i-2]==y:
        value=min(value,previous_previous[j-2]+1)
      current.append(value);row_min=min(row_min,value)
    if row_min>limit:return limit+1
    previous_previous,previous=previous,current
  return previous[-1]

def deletion_signatures(tokens):
  values={tuple(tokens)}
  for i in range(len(tokens)):values.add(tuple(tokens[:i])+tuple(tokens[i+1:]))
  return values

def build_confusions(sequences,canonical,maximum,minimum_length=3):
  buckets={}
  for i,sequence in enumerate(sequences):
    if not sequence or len(sequence)<minimum_length:continue
    for signature in deletion_signatures(sequence):buckets.setdefault(signature,[]).append(i)
  results=[[] for _ in sequences]
  for i,sequence in enumerate(sequences):
    if not sequence or len(sequence)<minimum_length:continue
    candidate_ids=set()
    for signature in deletion_signatures(sequence):
      members=buckets.get(signature,())
      if len(members)<=180:candidate_ids.update(members)
    ranked=[]
    for j in candidate_ids:
      if i==j or canonical[i]==canonical[j]:continue
      distance=edit_distance(sequence,sequences[j],2)
      if distance>2:continue
      score=1-distance/max(len(sequence),len(sequences[j]))
      if score>=0.58:ranked.append((score,-j,j))
    ranked.sort(reverse=True)
    results[i]=[[j,round(score,3)] for score,_,j in ranked[:maximum]]
  return results

candidates=[]
candidate_seen=set()
with open(SOURCE, encoding="utf-8", errors="ignore") as f:
  for line in f:
    w=line.split()[0].lower() if line.split() else ""
    if re.fullmatch(r"[a-z]+",w) and 2 < len(w) < 16 and w not in candidate_seen:
      candidates.append(w)
      candidate_seen.add(w)
    if len(candidates)>=80000: break
candidate_set=set(candidates)

vector_by_word={}
with zipfile.ZipFile(GLOVE_ZIP) as archive:
  names=[n for n in archive.namelist() if n.endswith(".txt") or n.endswith(".vec")]
  if not names: raise RuntimeError("GloVe 压缩包中未找到向量文本文件")
  with archive.open(names[0]) as f:
    for raw in f:
      parts=raw.decode("utf-8",errors="ignore").rstrip().split()
      if len(parts)!=101: continue
      word=parts[0].lower()
      if word in candidate_set and word not in vector_by_word:
        vector_by_word[word]=np.asarray(parts[1:],dtype=np.float32)

words=[w for w in candidates if w in vector_by_word][:WORD_COUNT]
if len(words)<WORD_COUNT: raise RuntimeError(f"GloVe 只覆盖 {len(words)} 个候选词")
vectors=np.stack([vector_by_word[w] for w in words])
vectors/=np.linalg.norm(vectors,axis=1,keepdims=True).clip(min=1e-12)
wordset=set(words)

raw_meanings={}
dictionary_meanings={}
definitions={}
pos_by_word={}
exchange_by_word={}
with open(DICT_SOURCE, encoding="utf-8", errors="ignore", newline="") as f:
  for row in csv.DictReader(f):
    w=(row.get("word") or "").lower()
    translation=(row.get("translation") or "").replace("\\n","\n")
    lines=[x.strip() for x in translation.splitlines() if x.strip() and not x.startswith("[网络]")]
    if lines and w not in dictionary_meanings:
      meaning=re.sub(r"^(n|v|vt|vi|a|adj|ad|adv|prep|pron|conj|aux|num|art|int)\.\s*", "", lines[0])
      parts=[x.strip() for x in re.split(r"[；;,，]",meaning) if x.strip()]
      dictionary_meanings[w]="；".join(parts[:2])[:34]
    if w not in wordset or w in definitions: continue
    definition=(row.get("definition") or "").replace("\\n","\n")
    definitions[w]=definition
    pos_by_word[w]=parse_pos(definition,translation)
    exchange_by_word[w]=row.get("exchange") or ""
    if w in dictionary_meanings:raw_meanings[w]=dictionary_meanings[w]

meanings=[dictionary_meanings.get(w,"低频词或专有名称") for w in words]
canonical=[canonical_form(w,exchange_by_word.get(w,""),wordset) for w in words]
pos_sets=[pos_by_word.get(w,set()) for w in words]
groups=[FUNCTION_GROUP_BY_WORD.get(w) for w in words]

def synset_chinese(synset,word):
  try:candidates=[x.replace('_','、').replace('+','') for x in synset.lemma_names('cmn')]
  except (LookupError,AttributeError,WordNetError):
    mapped=[]
    for lemma in synset.lemmas():
      try:
        legacy_synset=legacy_wn.lemma_from_key(lemma.key()).synset()
        if legacy_synset not in mapped:mapped.append(legacy_synset)
      except (LookupError,ValueError,WordNetError):pass
    candidates=[]
    for legacy_synset in mapped:
      try:candidates.extend(x.replace('_','、').replace('+','') for x in legacy_synset.lemma_names('cmn'))
      except (LookupError,WordNetError):pass
  common=raw_meanings.get(word,'')
  exact=next((x for x in candidates if x in common or common in x),None)
  chosen=[]
  for value in ([exact] if exact else [])+candidates:
    if value and value not in chosen:chosen.append(value)
  if chosen:return '；'.join(chosen[:3])
  for lemma in synset.lemmas():
    fallback=dictionary_meanings.get(lemma.name().lower())
    if fallback:return fallback+'（通用义）'
  return ''

# WordNet relations are collected from the most common senses. Keeping the
# sense window small reduces unrelated links caused by rare meanings.
word_index={w:i for i,w in enumerate(words)}

# Moby is deliberately treated as a broad candidate generator rather than a
# source of strict synonyms: it is a thesaurus without sense IDs and contains
# topical or stylistic associations as well as substitutable words.
moby_candidates={}
if os.path.exists(MOBY_SOURCE):
  with open(MOBY_SOURCE,encoding="utf-8",errors="ignore") as source:
    for line in source:
      fields=[field.strip().lower() for field in line.rstrip().split(',')]
      if len(fields)<2:continue
      head=fields[0]
      if head not in word_index:continue
      candidates_for_head=[]
      seen=set()
      for value in fields[1:]:
        if value in seen or not re.fullmatch(r'[a-z]+',value):continue
        target_id=word_index.get(value)
        if target_id is None or target_id>=LEXICAL_MAX_RANK:continue
        seen.add(value);candidates_for_head.append(target_id)
      if candidates_for_head:moby_candidates[head]=candidates_for_head
  print(f"loaded Moby candidates for {len(moby_candidates)} words",flush=True)

# The compact Simple-English Wiktionary extract provides human-curated,
# sense-level synonym and antonym links for many common words. The full English
# dump is several gigabytes, so the generator accepts the same JSONL schema via
# WIKTIONARY_SOURCE without making it part of the published web payload.
WIKT_POS={"noun":"n","verb":"v","adj":"a","adv":"r"}
wiktionary_relations={}
if os.path.exists(WIKTIONARY_SOURCE):
  opener=gzip.open if WIKTIONARY_SOURCE.endswith('.gz') else open
  with opener(WIKTIONARY_SOURCE,'rt',encoding='utf-8',errors='ignore') as source:
    for line in source:
      try:entry=json.loads(line)
      except json.JSONDecodeError:continue
      head=(entry.get('word') or '').lower()
      pos=WIKT_POS.get(entry.get('pos'))
      if head not in word_index or not pos:continue
      for sense in entry.get('senses') or ():
        gloss='; '.join(sense.get('glosses') or ())
        synonyms=[];antonyms=[]
        for relation,bucket in ((sense.get('synonyms') or (),synonyms),(sense.get('antonyms') or (),antonyms)):
          for item in relation:
            name=(item.get('word') or '').lower()
            target_id=word_index.get(name) if re.fullmatch(r'[a-z]+',name) else None
            if target_id is not None and target_id<LEXICAL_MAX_RANK and target_id!=word_index[head]:bucket.append(target_id)
        if synonyms or antonyms:
          wiktionary_relations.setdefault((head,pos),[]).append((gloss,text_vector(gloss),synonyms,antonyms))
  print(f"loaded Wiktionary relations for {len(wiktionary_relations)} word/POS pairs",flush=True)

synset_vector_cache={}
synset_lookup_cache={}
def synset_vector(synset):
  name=synset.name()
  if name not in synset_vector_cache:synset_vector_cache[name]=text_vector(synset.definition())
  return synset_vector_cache[name]

def target_synsets(target_id,pos):
  key=(target_id,pos)
  if key not in synset_lookup_cache:synset_lookup_cache[key]=wn.synsets(words[target_id],pos=pos)[:4]
  return synset_lookup_cache[key]

def adjacent_synset_names(synset):
  direct_parents=synset.hypernyms()
  direct_children=synset.hyponyms()
  adjacent={item.name():1.0 for item in direct_parents+direct_children}
  for parent in direct_parents:
    for sibling in parent.hyponyms():
      if sibling!=synset:adjacent.setdefault(sibling.name(),0.86)
  return adjacent

def obvious_morphological_opposite(left,right):
  for prefix in ('un','in','im','ir','dis','non'):
    if left==prefix+right or right==prefix+left:return True
  return False

def ordered_synsets(word,limit=6):
  synsets=wn.synsets(word)
  if wn is legacy_wn:return synsets[:limit]
  # OEWN sense keys are stable across editions even when synset numbering or
  # WNDB index order changes. Reapply Princeton WordNet's learner-friendly
  # common-sense order so e.g. medical doctor remains ahead of Doctor of the
  # Church, while still using OEWN's newer definitions and relations.
  key_order={}
  for position,legacy_synset in enumerate(legacy_wn.synsets(word)):
    for lemma in legacy_synset.lemmas():
      if lemma.name().lower()==word:key_order[lemma.key()]=position
  def sense_order(synset):
    positions=[key_order[lemma.key()] for lemma in synset.lemmas() if lemma.name().lower()==word and lemma.key() in key_order]
    return (min(positions) if positions else 1000,synsets.index(synset))
  return sorted(synsets,key=sense_order)[:limit]

def concept_allowed(synset):
  if synset.name() in BLOCKED_CONCEPT_SYNSETS:return False
  text=' '.join([synset.name(),synset.definition()]+[lemma.name().lower() for lemma in synset.lemmas()])
  return not any(term in text for term in BLOCKED_CONCEPT_TERMS)

def concept_targets(related_synsets,current_word):
  found=[]
  for related in related_synsets:
    if not concept_allowed(related):continue
    names=[lemma.name().lower() for lemma in related.lemmas()]
    whole=[name for name in names if re.fullmatch(r'[a-z]+',name) and name in word_index and name!=current_word and word_index[name]<CONCEPT_MAX_RANK]
    if whole:
      target=min(whole,key=lambda name:word_index[name]);display=target
    else:
      phrases=[]
      for name in names:
        parts=name.split('_')
        if 1<len(parts)<=2 and all(part in word_index and word_index[part]<CONCEPT_MAX_RANK for part in parts):
          phrases.append((max(word_index[part] for part in parts),sum(word_index[part] for part in parts),name))
      if not phrases:continue
      _,_,preferred=min(phrases);display=preferred.replace('_',' ')
      parts=preferred.split('_');target=min(parts,key=lambda part:word_index[part])
    target_id=word_index[target]
    chinese=synset_chinese(related,target or '')
    found.append([target_id,related.name(),related.definition(),chinese,display])
  found.sort(key=lambda item:(' ' in item[4],item[0],item[4]))
  return found[:CONCEPT_NODE_LIMIT]

def concept_has_learner_name(synset):
  for lemma in synset.lemmas():
    name=lemma.name().lower()
    if re.fullmatch(r'[a-z]+',name) and name in word_index and word_index[name]<CONCEPT_MAX_RANK:return True
    parts=name.split('_')
    if 1<len(parts)<=2 and all(part in word_index and word_index[part]<CONCEPT_MAX_RANK for part in parts):return True
  return False

def simplified_relations(synset,direction,depth=1,seen=None):
  seen=set() if seen is None else seen
  related=synset.hypernyms() if direction=='up' else synset.hyponyms()
  result=[]
  for item in related:
    if not concept_allowed(item):continue
    if item.name() in seen:continue
    seen.add(item.name())
    # Preserve a common multiword concept such as "domestic animal". Only an
    # unnameable technical bridge such as "chromatic color" may be skipped,
    # and only for one level so the learning tree does not pull in descendants.
    bridge=not concept_has_learner_name(item) and bool(item.hypernyms()) and bool(item.hyponyms()) and depth>0
    if bridge:result.extend(simplified_relations(item,direction,depth-1,seen))
    else:result.append(item)
  return result

def concept_record(synset,current_word):
  raw_parents=synset.hypernyms();raw_children=synset.hyponyms()
  parents=concept_targets(raw_parents,current_word);children=concept_targets(raw_children,current_word)
  learning_parents=concept_targets(simplified_relations(synset,'up'),current_word)
  learning_children=concept_targets(simplified_relations(synset,'down'),current_word)
  hidden=sum(not concept_allowed(item) for item in raw_parents+raw_children)
  return [synset.name(),synset.pos(),synset.definition(),synset_chinese(synset,current_word),parents,children,learning_parents,learning_children,synset.name() in SENSITIVE_CONCEPT_ROOTS,hidden]

lexical_relations=[]
typed_relations=[]
concept_senses=[]
lexical_senses=[]
for number,w in enumerate(words):
  relations={}
  typed={key:set() for key in ("syn","ant","hyper","hypo","hyper2","hypo2","deriv")}
  def remember(target,relation):
    if target and target in word_index and target!=w and canonical[word_index[target]]!=canonical[number]:typed[relation].add(word_index[target])
    add_relation(relations,target,relation)
  word_synsets=ordered_synsets(w)
  word_concepts=[]
  word_lexical=[]
  for synset_number,synset in enumerate(word_synsets):
    exact_synonyms=set();near_synonyms=set();near_scores={};sense_antonyms=set();sense_derivations=set();sense_chinese={}
    def remember_sense_chinese(target_id,target_synset=None):
      if target_synset is None:
        source_vector=synset_vector(synset)
        candidates=target_synsets(target_id,'a' if synset.pos()=='s' else synset.pos())
        if candidates:
          def match_score(candidate):
            target_vector=synset_vector(candidate)
            return float(source_vector@target_vector) if source_vector is not None and target_vector is not None else 0
          target_synset=max(candidates,key=match_score)
      if target_synset is not None:
        chinese=synset_chinese(target_synset,words[target_id])
        if chinese:sense_chinese[target_id]=chinese
    def keep_lexical(name,bucket,target_synset=None):
      target=clean_lemma(name)
      if not target or target not in word_index:return
      target_id=word_index[target]
      if target_id>=LEXICAL_MAX_RANK or target_id==number or canonical[target_id]==canonical[number]:return
      bucket.add(target_id);remember_sense_chinese(target_id,target_synset)
    def keep_near(name,score,target_synset=None):
      target=clean_lemma(name)
      if not target or target not in word_index:return
      target_id=word_index[target]
      if target_id>=LEXICAL_MAX_RANK or target_id==number or canonical[target_id]==canonical[number]:return
      near_synonyms.add(target_id);near_scores[target_id]=max(score,near_scores.get(target_id,0));remember_sense_chinese(target_id,target_synset)
    for lemma in synset.lemmas():
      target=clean_lemma(lemma.name())
      if target!=w: remember(target,"syn")
      keep_lexical(lemma.name(),exact_synonyms,synset)
      for antonym in lemma.antonyms():
        remember(clean_lemma(antonym.name()),"ant");keep_lexical(antonym.name(),sense_antonyms,antonym.synset())
      for derived in lemma.derivationally_related_forms():
        remember(clean_lemma(derived.name()),"deriv");keep_lexical(derived.name(),sense_derivations,derived.synset())
    # WordNet adjective synsets often have no second lemma. Head adjectives
    # point to a cluster of satellite adjectives, while a satellite such as
    # "gorgeous" usually points back only to the head "beautiful". Expand the
    # head's cluster so every member gets the same useful learner neighborhood.
    if synset.pos() in ('a','s'):
      adjective_neighbors=list(synset.similar_tos())+list(synset.also_sees())
      if synset.pos()=='s':
        for head in synset.similar_tos():
          adjective_neighbors.extend(head.similar_tos())
          adjective_neighbors.extend(head.also_sees())
          for lemma in head.lemmas():
            for antonym in lemma.antonyms():keep_lexical(antonym.name(),sense_antonyms,antonym.synset())
      for related in adjective_neighbors:
        for lemma in related.lemmas():keep_near(lemma.name(),1.0,related)

    # Import explicit Wiktionary links only from the closest matching gloss for
    # this part of speech. These remain in the learner-facing "near synonym"
    # group because Wiktionary's synonym lists are intentionally broader than
    # a WordNet synset.
    wikt_pos='a' if synset.pos()=='s' else synset.pos()
    wikt_senses=wiktionary_relations.get((w,wikt_pos),()) if synset_number==0 else ()
    if wikt_senses:
      source_vector=synset_vector(synset)
      scored=[]
      for record in wikt_senses:
        score=float(source_vector@record[1]) if source_vector is not None and record[1] is not None else 0
        scored.append((score,record))
      # Both dictionaries put the most common sense first. Preserve that
      # alignment for the first WordNet sense; use gloss matching afterwards.
      score,record=(scored[0] if synset_number==0 else max(scored,key=lambda item:item[0]))
      if score>=0.18 or len(scored)==1:
        for target_id in record[2]:keep_near(words[target_id],1.15)
        for target_id in record[3]:keep_lexical(words[target_id],sense_antonyms)

    # Moby greatly improves noun and verb recall (teacher -> educator/tutor),
    # but is not sense-tagged. Require the same WordNet part of speech, a close
    # taxonomy/gloss match and a sufficiently strong embedding similarity.
    # For adjectives WordNet/Wiktionary are preferred; Moby is only a fallback
    # when they provide fewer than six useful neighbors.
    use_moby=synset.pos() in ('n','v')
    if use_moby:
      source_vector=synset_vector(synset)
      source_pos='a' if synset.pos()=='s' else synset.pos()
      adjacent=adjacent_synset_names(synset)
      scored_moby=[]
      for target_id in moby_candidates.get(w,()):
        target=words[target_id]
        if target_id in exact_synonyms or target_id in sense_antonyms or obvious_morphological_opposite(w,target):continue
        candidates_for_target=target_synsets(target_id,source_pos)
        if not candidates_for_target:continue
        cosine=float(vectors[number]@vectors[target_id])
        if cosine<0.40:continue
        relation_strength=0.0;definition_score=0.0
        for target_synset in candidates_for_target:
          strength=adjacent.get(target_synset.name(),0)
          if not strength:continue
          relation_strength=max(relation_strength,strength)
          target_vector=synset_vector(target_synset)
          if source_vector is not None and target_vector is not None:
            definition_score=max(definition_score,float(source_vector@target_vector))
        if not relation_strength:continue
        score=0.58*cosine+0.28*relation_strength+0.10*max(0,definition_score)+0.04*(1-target_id/LEXICAL_MAX_RANK)
        if score>=0.50:scored_moby.append((score,target_id))
      for score,target_id in sorted(scored_moby,key=lambda item:(-item[0],item[1]))[:LEXICAL_NODE_LIMIT]:
        keep_near(words[target_id],score)

    near_synonyms-=exact_synonyms
    near_synonyms-=sense_antonyms
    for related in synset.hypernyms():
      for lemma in related.lemmas(): remember(clean_lemma(lemma.name()),"hyper")
      for second in related.hypernyms():
        for lemma in second.lemmas(): remember(clean_lemma(lemma.name()),"hyper2")
    for related in synset.hyponyms():
      for lemma in related.lemmas(): remember(clean_lemma(lemma.name()),"hypo")
      for second in related.hyponyms():
        for lemma in second.lemmas(): remember(clean_lemma(lemma.name()),"hypo2")
    # Concept-tree data stays sense-specific. Explicitly blocked historical or
    # misleading senses are omitted from the picker as well as from relations.
    if concept_allowed(synset):
      word_concepts.append(concept_record(synset,w))
      word_lexical.append([
        synset.name(),synset.pos(),synset.definition(),synset_chinese(synset,w),
        sorted(exact_synonyms)[:LEXICAL_NODE_LIMIT],sorted(near_synonyms,key=lambda target_id:(-near_scores.get(target_id,0),target_id))[:LEXICAL_NODE_LIMIT],
        sorted(sense_antonyms)[:LEXICAL_NODE_LIMIT],sorted(sense_derivations)[:LEXICAL_NODE_LIMIT],sense_chinese
      ])
  lexical_relations.append({word_index[target]:relation for target,relation in relations.items() if target in word_index})
  typed_relations.append({key:sorted(values) for key,values in typed.items()})
  concept_senses.append(word_concepts)
  lexical_senses.append(word_lexical)
  if number and number%5000==0: print(f"wordnet {number}/{len(words)}",flush=True)

# Multiword synsets use a vocabulary component such as "color" only as a
# loading/navigation proxy. Keep their records in a separate index so they do
# not pollute the ordinary word's sense picker.
known=[{record[0] for record in records} for records in concept_senses]
concept_extras={};concept_extra_proxy={}
frontier=[target for records in concept_senses for record in records for target in record[4]+record[5]]
for _ in range(3):
  next_frontier=[]
  for target in frontier:
    target_id,sense_name=target[0],target[1]
    if target_id<0 or sense_name in known[target_id] or sense_name in concept_extras:continue
    record=concept_record(wn.synset(sense_name),words[target_id])
    concept_extras[sense_name]=record;concept_extra_proxy[sense_name]=target_id
    next_frontier.extend(record[4]+record[5])
  frontier=next_frontier
  if not frontier:break

print("building spelling confusions",flush=True)
shape_confusions=build_confusions([tuple(w) for w in words],canonical,CONFUSION_COUNT)

print("building pronunciation confusions",flush=True)
cmu=cmudict.dict()
pronunciations=[]
for w in words:
  entries=cmu.get(w)
  pronunciations.append(tuple(re.sub(r"\d", "", phone) for phone in entries[0]) if entries else ())
sound_confusions=build_confusions(pronunciations,canonical,CONFUSION_COUNT,minimum_length=2)
for i,rows in enumerate(sound_confusions):
  for row in rows:row.append("same" if pronunciations[i]==pronunciations[row[0]] else "near")

MISUSE_GROUPS=[
  ("accept","except"),("adapt","adopt"),("affect","effect"),("advice","advise"),
  ("borrow","lend"),("bring","take"),("complement","compliment"),("desert","dessert"),
  ("economic","economical"),("emigrate","immigrate"),("ensure","insure"),("farther","further"),
  ("lay","lie"),("loose","lose"),("personal","personnel"),("principal","principle"),
  ("quiet","quite"),("raise","rise"),("stationary","stationery"),("than","then"),
  ("weather","whether"),("who","whom")
]
misuse=[[] for _ in words]
for left,right in MISUSE_GROUPS:
  if left in word_index and right in word_index:
    a,b=word_index[left],word_index[right];misuse[a].append(b);misuse[b].append(a)

# Average vectors of informative words in ECDICT's English gloss. This is a
# conservative semantic signal, not a replacement for a lexical ontology.
gloss_vectors=np.zeros_like(vectors)
gloss_valid=np.zeros(len(words),dtype=bool)
for i,w in enumerate(words):
  parts=[vector_by_word[t] for t in gloss_tokens(definitions.get(w,"")) if t in vector_by_word]
  if parts:
    gloss_vectors[i]=np.mean(parts,axis=0)
    norm=np.linalg.norm(gloss_vectors[i])
    if norm>1e-12:
      gloss_vectors[i]/=norm
      gloss_valid[i]=True

neighbors=[]
block_size=384
for start in range(0,len(words),block_size):
  sims=vectors[start:start+block_size] @ vectors.T
  rows=np.arange(sims.shape[0])
  sims[rows,start+rows]=-np.inf
  idx=np.argpartition(sims,-SEARCH_COUNT,axis=1)[:,-SEARCH_COUNT:]
  vals=np.take_along_axis(sims,idx,axis=1)
  order=np.argsort(vals,axis=1)[:,::-1]
  idx=np.take_along_axis(idx,order,axis=1)
  vals=np.take_along_axis(vals,order,axis=1)
  for offset,(js,ss) in enumerate(zip(idx,vals)):
    i=start+offset
    ranked=[]
    candidates_for_word={int(j):float(s) for j,s in zip(js,ss)}
    for j in lexical_relations[i]:
      if j not in candidates_for_word: candidates_for_word[j]=float(vectors[i] @ vectors[j])
    for j,s in candidates_for_word.items():
      if is_regular_plural(words[j],wordset): continue
      if canonical[i]==canonical[j]: continue
      score=0.88*float(s)
      if pos_sets[i] and pos_sets[j] and pos_sets[i].intersection(pos_sets[j]): score+=0.025
      if groups[i] and groups[i]==groups[j]:
        score+=0.10
      elif not groups[i] and groups[j]:
        # Conditional penalty: function words remain strong for queries such
        # as which -> what, but drift downward around content words like learn.
        score-=0.065
        score-=0.02*max(0.0,1.0-j/5000.0)
      if gloss_valid[i] and gloss_valid[j]:
        score+=0.07*max(0.0,float(gloss_vectors[i] @ gloss_vectors[j]))
      relation=lexical_relations[i].get(j)
      if relation: score+=RELATION_BONUS[relation]
      ranked.append((score,j,relation))
    ranked.sort(reverse=True)
    neighbors.append([[j,round(max(0.0,min(0.999,score)),3),relation] if relation else [j,round(max(0.0,min(0.999,score)),3)] for score,j,relation in ranked[:NEIGHBOR_COUNT]])
  print(f"neighbors {min(start+block_size,len(words))}/{len(words)}",flush=True)

os.makedirs(DATA_DIR,exist_ok=True)

core_path=os.path.join(DATA_DIR,"core.js")
core={"model":f"GloVe 2024 WikiGigaword 100d + ECDICT + {WORDNET_LABEL} rerank","rerank":RERANK_VERSION+"+wordnet-v3+wiktionary+moby","words":words,"meanings":meanings}
with open(core_path,"w",encoding="utf-8") as f:
  f.write("window.VOCAB_DATA=")
  json.dump(core,f,separators=(",",":"),ensure_ascii=False)
  f.write(";")

chunk_meta={}
detail_meta={}
for letter in "abcdefghijklmnopqrstuvwxyz":
  ids=[i for i,w in enumerate(words) if w[0]==letter]
  payload={"ids":ids,"neighbors":[neighbors[i] for i in ids]}
  path=os.path.join(DATA_DIR,f"neighbors-{letter}.js")
  with open(path,"w",encoding="utf-8") as f:
    f.write("window.VOCAB_CHUNKS=window.VOCAB_CHUNKS||{};")
    f.write(f"window.VOCAB_CHUNKS[{json.dumps(letter)}]=")
    json.dump(payload,f,separators=(",",":"),ensure_ascii=False)
    f.write(";")
  chunk_meta[letter]={"bytes":os.path.getsize(path),"count":len(ids)}
  detail_rows=[]
  for i in ids:
    relations=typed_relations[i]
    detail_rows.append([
      relations["syn"],relations["ant"],relations["hyper"],relations["hypo"],
      relations["hyper2"],relations["hypo2"],relations["deriv"],
      shape_confusions[i],sound_confusions[i],misuse[i],concept_senses[i],lexical_senses[i]
    ])
  extra={name:record for name,record in concept_extras.items() if words[concept_extra_proxy[name]][0]==letter}
  detail_payload={"ids":ids,"details":detail_rows,"concepts":extra}
  detail_path=os.path.join(DATA_DIR,f"details-{letter}.js")
  with open(detail_path,"w",encoding="utf-8") as f:
    f.write("window.VOCAB_DETAIL_CHUNKS=window.VOCAB_DETAIL_CHUNKS||{};")
    f.write(f"window.VOCAB_DETAIL_CHUNKS[{json.dumps(letter)}]=")
    json.dump(detail_payload,f,separators=(",",":"),ensure_ascii=False)
    f.write(";")
  detail_meta[letter]={"bytes":os.path.getsize(detail_path),"count":len(ids)}

manifest={"version":35,"coreBytes":os.path.getsize(core_path),"chunks":chunk_meta,"details":detail_meta}
manifest_path=os.path.join(DATA_DIR,"manifest.js")
with open(manifest_path,"w",encoding="utf-8") as f:
  f.write("window.VOCAB_MANIFEST=")
  json.dump(manifest,f,separators=(",",":"))
  f.write(";")
print(f"done: {len(words)} words -> {DATA_DIR} ({len(chunk_meta)} chunks)")
