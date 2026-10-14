# Transformer Trace Lab

一个无需安装依赖的本地网页，用真实、确定性的微型 Transformer 展示完整前向传播。

## 启动

在本目录执行：

```bash
python3 -m http.server 4173
```

然后访问 <http://localhost:4173>。

## 功能

- 支持自定义中英文输入。
- 在一张连续宽幅画布中逐节点展示完整前向传播，每次“下一步”仅新增一个算子或矩阵。
- Embedding 展示 Token 向量、位置编码与逐元素加法结果；点击相同坐标可联动追溯。
- LayerNorm 分解为 Mean、Variance、Normalized 与仿射输出。
- 显式展示两头的 `Wq₁/Wk₁/Wv₁/Wq₂/Wk₂/Wv₂` 六个 `[4×2]` 权重矩阵，以及 `Q₁/K₁/V₁/Q₂/K₂/V₂` 六个 `[T×2]` 投影结果。
- 展示双头 Masked Attention、输出投影、Residual、MLP、最终 LayerNorm、Logits 和采样概率。
- 曲线箭头连接具体矩阵，Residual 旁路从画布右侧空白通道汇入“+”节点。
- 每个节点标注上游张量、模型参数、固定常量或用户参数来源。
- 可调 Temperature、Top-k、显示精度，并可导出完整计算 JSON。

## 模型说明

这是一个固定参数的教学模型：1 个 Transformer Block、2 个注意力头、`d_model=4`、`d_ff=8`。计算顺序与 GPT-2 decoder block 对齐，但不使用预训练权重，因此它用于逐数值理解计算，不用于生成有语言质量的文本。
