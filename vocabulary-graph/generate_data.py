import csv, json, os, re, zipfile
import numpy as np
import nltk
from nltk.corpus import wordnet as wn

SOURCE = "/tmp/en_full.txt"
DICT_SOURCE = "/tmp/ecdict.csv"
GLOVE_ZIP = "/tmp/glove.2024.wikigiga.100d.zip"
DATA_DIR = "vocabulary-graph/data"
WORD_COUNT = 50000
NEIGHBOR_COUNT = 40
SEARCH_COUNT = 500
RERANK_VERSION = "ecdict-pos-gloss-v1"
WORDNET_DATA = os.environ.get("WORDNET_DATA", "/tmp/wordorbit-nltk-private")
nltk.data.path.insert(0, WORDNET_DATA)
RELATION_BONUS={"syn":0.14,"ant":0.11,"hyper":0.09,"hypo":0.09,"hyper2":0.05,"hypo2":0.05,"deriv":0.06}
RELATION_PRIORITY={"syn":6,"ant":5,"hyper":4,"hypo":4,"hyper2":3,"hypo2":3,"deriv":2}
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

def clean_lemma(name):
  word=name.lower().replace("_"," ")
  return word if re.fullmatch(r"[a-z]+",word) else None

def add_relation(relations, target, relation):
  if target and (target not in relations or RELATION_PRIORITY[relation]>RELATION_PRIORITY[relations[target]]):
    relations[target]=relation

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
definitions={}
pos_by_word={}
exchange_by_word={}
with open(DICT_SOURCE, encoding="utf-8", errors="ignore", newline="") as f:
  for row in csv.DictReader(f):
    w=(row.get("word") or "").lower()
    if w not in wordset or w in definitions: continue
    definition=(row.get("definition") or "").replace("\\n","\n")
    translation=(row.get("translation") or "").replace("\\n","\n")
    definitions[w]=definition
    pos_by_word[w]=parse_pos(definition,translation)
    exchange_by_word[w]=row.get("exchange") or ""
    text=translation
    lines=[x.strip() for x in text.splitlines() if x.strip() and not x.startswith("[网络]")]
    if not lines: continue
    meaning=re.sub(r"^(n|v|vt|vi|a|adj|ad|adv|prep|pron|conj|aux|num|art|int)\.\s*", "", lines[0])
    parts=[x.strip() for x in re.split(r"[；;,，]",meaning) if x.strip()]
    raw_meanings[w]="；".join(parts[:2])[:34]

meanings=[raw_meanings.get(w,"低频词或专有名称") for w in words]
canonical=[canonical_form(w,exchange_by_word.get(w,""),wordset) for w in words]
pos_sets=[pos_by_word.get(w,set()) for w in words]
groups=[FUNCTION_GROUP_BY_WORD.get(w) for w in words]

# WordNet relations are collected from the most common senses. Keeping the
# sense window small reduces unrelated links caused by rare meanings.
word_index={w:i for i,w in enumerate(words)}
lexical_relations=[]
for number,w in enumerate(words):
  relations={}
  for synset in wn.synsets(w)[:4]:
    for lemma in synset.lemmas():
      target=clean_lemma(lemma.name())
      if target!=w: add_relation(relations,target,"syn")
      for antonym in lemma.antonyms(): add_relation(relations,clean_lemma(antonym.name()),"ant")
      for derived in lemma.derivationally_related_forms(): add_relation(relations,clean_lemma(derived.name()),"deriv")
    for related in synset.hypernyms():
      for lemma in related.lemmas(): add_relation(relations,clean_lemma(lemma.name()),"hyper")
      for second in related.hypernyms():
        for lemma in second.lemmas(): add_relation(relations,clean_lemma(lemma.name()),"hyper2")
    for related in synset.hyponyms():
      for lemma in related.lemmas(): add_relation(relations,clean_lemma(lemma.name()),"hypo")
      for second in related.hyponyms():
        for lemma in second.lemmas(): add_relation(relations,clean_lemma(lemma.name()),"hypo2")
  lexical_relations.append({word_index[target]:relation for target,relation in relations.items() if target in word_index})
  if number and number%5000==0: print(f"wordnet {number}/{len(words)}",flush=True)

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
core={"model":"GloVe 2024 WikiGigaword 100d + ECDICT + WordNet rerank","rerank":RERANK_VERSION+"+wordnet-v2","words":words,"meanings":meanings}
with open(core_path,"w",encoding="utf-8") as f:
  f.write("window.VOCAB_DATA=")
  json.dump(core,f,separators=(",",":"),ensure_ascii=False)
  f.write(";")

chunk_meta={}
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

manifest={"version":14,"coreBytes":os.path.getsize(core_path),"chunks":chunk_meta}
manifest_path=os.path.join(DATA_DIR,"manifest.js")
with open(manifest_path,"w",encoding="utf-8") as f:
  f.write("window.VOCAB_MANIFEST=")
  json.dump(manifest,f,separators=(",",":"))
  f.write(";")
print(f"done: {len(words)} words -> {DATA_DIR} ({len(chunk_meta)} chunks)")
