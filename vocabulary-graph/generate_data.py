import csv, json, re, zipfile
import numpy as np

SOURCE = "/tmp/en_full.txt"
DICT_SOURCE = "/tmp/ecdict.csv"
GLOVE_ZIP = "/tmp/glove.2024.wikigiga.100d.zip"
OUT = "vocabulary-graph/vocab-data.js"
WORD_COUNT = 50000
NEIGHBOR_COUNT = 40
SEARCH_COUNT = 500
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
  for js,ss in zip(idx,vals):
    kept=[]
    for j,s in zip(js,ss):
      if is_regular_plural(words[int(j)],wordset): continue
      kept.append([int(j),round(float(s),3)])
      if len(kept)==NEIGHBOR_COUNT: break
    neighbors.append(kept)
  print(f"neighbors {min(start+block_size,len(words))}/{len(words)}",flush=True)

raw_meanings={}
with open(DICT_SOURCE, encoding="utf-8", errors="ignore", newline="") as f:
  for row in csv.DictReader(f):
    w=(row.get("word") or "").lower()
    if w not in wordset or w in raw_meanings: continue
    text=(row.get("translation") or "").replace("\\n","\n")
    lines=[x.strip() for x in text.splitlines() if x.strip() and not x.startswith("[网络]")]
    if not lines: continue
    meaning=re.sub(r"^(n|v|vt|vi|a|adj|ad|adv|prep|pron|conj|aux|num|art|int)\.\s*", "", lines[0])
    parts=[x.strip() for x in re.split(r"[；;,，]",meaning) if x.strip()]
    raw_meanings[w]="；".join(parts[:2])[:34]

meanings=[raw_meanings.get(w,"低频词或专有名称") for w in words]
payload={"model":"GloVe 2024 WikiGigaword 100d","words":words,"meanings":meanings,"neighbors":neighbors}
with open(OUT,"w",encoding="utf-8") as f:
  f.write("window.VOCAB_DATA=")
  json.dump(payload,f,separators=(",",":"),ensure_ascii=False)
  f.write(";")
print(f"done: {len(words)} words -> {OUT}")
