# MLP Forward / Backward / 梯度更新教程

这份教程用于配合当前 MLP 可视化页面理解完整训练过程：如何做 forward，如何计算 loss，如何做 backward，如何得到梯度，以及最后如何修改权重 $W$ 和偏置 $b$。

本文默认网络使用 Sigmoid 激活函数，输出为二分类概率。代码实现对应 `mlp.js` 中的 `forwardLayer`、`backwardLayer`、`accumulateGradients`、`applyAccumulatedGradients` 和 `applyGradients`。

---

## 1. 记号约定

假设 MLP 一共有 $L$ 层需要计算参数，其中第 $0$ 层是输入层，第 $L$ 层是输出层。

第 $l$ 层的参数为：

$$
W^{(l)} \in \mathbb{R}^{n_l \times n_{l-1}}
$$

$$
b^{(l)} \in \mathbb{R}^{n_l \times 1}
$$

其中：

- $n_l$ 表示第 $l$ 层神经元数量。
- $W^{(l)}_{j,k}$ 表示第 $l-1$ 层第 $k$ 个神经元到第 $l$ 层第 $j$ 个神经元的权重。
- $b^{(l)}_j$ 表示第 $l$ 层第 $j$ 个神经元的偏置。

对单个样本：

$$
a^{(0)} = x
$$

对 mini-batch：假设 batch size 为 $m$，把 $m$ 个样本按列拼成矩阵：

$$
A^{(0)} = X_B \in \mathbb{R}^{n_0 \times m}
$$

也就是说：

$$
X_B =
\begin{bmatrix}
| & | & & | \\
x_1 & x_2 & \cdots & x_m \\
| & | & & |
\end{bmatrix}
$$

标签也按列组织：

$$
Y_B =
\begin{bmatrix}
y_1 & y_2 & \cdots & y_m
\end{bmatrix}
$$

---

## 2. Sigmoid 激活函数

当前可视化页面使用 Sigmoid：

$$
\sigma(z) = \frac{1}{1 + e^{-z}}
$$

它的导数非常重要，因为 backward 会频繁用到：

$$
\sigma'(z) = \sigma(z)(1 - \sigma(z))
$$

由于前向传播中已经保存了：

$$
a = \sigma(z)
$$

所以 backward 里通常直接写成：

$$
\sigma'(z) = a(1-a)
$$

---

## 3. Forward：单样本计算

对第 $l$ 层，单个样本的 forward 是：

$$
z^{(l)} = W^{(l)}a^{(l-1)} + b^{(l)}
$$

然后做激活：

$$
a^{(l)} = \sigma(z^{(l)})
$$

展开到第 $j$ 个神经元：

$$
z^{(l)}_j = \sum_{k=1}^{n_{l-1}} W^{(l)}_{j,k}a^{(l-1)}_k + b^{(l)}_j
$$

$$
a^{(l)}_j = \sigma(z^{(l)}_j)
$$

这个过程从第 $1$ 层一直算到输出层 $L$。

输出层只有一个神经元时，预测值就是：

$$
\hat{y} = a^{(L)}_1
$$

---

## 4. Forward：mini-batch 矩阵计算

mini-batch 的核心思想是：一次把 $m$ 个样本一起算。每一列是一个样本。

第 $l$ 层的输入激活矩阵是：

$$
A^{(l-1)} \in \mathbb{R}^{n_{l-1} \times m}
$$

权重矩阵：

$$
W^{(l)} \in \mathbb{R}^{n_l \times n_{l-1}}
$$

矩阵乘法得到：

$$
W^{(l)}A^{(l-1)} \in \mathbb{R}^{n_l \times m}
$$

偏置 $b^{(l)}$ 需要广播到每一列：

$$
b^{(l)}\mathbf{1}^{\top} \in \mathbb{R}^{n_l \times m}
$$

其中：

$$
\mathbf{1} \in \mathbb{R}^{m \times 1}
$$

所以 mini-batch 的 forward 是：

$$
Z^{(l)} = W^{(l)}A^{(l-1)} + b^{(l)}\mathbf{1}^{\top}
$$

$$
A^{(l)} = \sigma(Z^{(l)})
$$

注意这里的 Sigmoid 是逐元素计算：

$$
A^{(l)}_{j,i} = \sigma(Z^{(l)}_{j,i})
$$

其中第 $i$ 列对应 batch 里的第 $i$ 个样本。

---

## 5. Loss 计算

当前页面支持两类 loss：MSE 和 BCE。

### 5.1 MSE：平方误差

单个样本的 MSE 写成：

$$
L = \frac{1}{2}(\hat{y} - y)^2
$$

这里加上 $\frac{1}{2}$ 是为了求导时抵消平方带来的系数 $2$。

mini-batch 下，每个样本都有自己的 loss：

$$
L_i = \frac{1}{2}(\hat{y}_i - y_i)^2
$$

batch 平均 loss 是：

$$
L_B = \frac{1}{m}\sum_{i=1}^{m}L_i
$$

### 5.2 BCE：二元交叉熵

单个样本的 BCE 是：

$$
L = -\left[y\log(\hat{y}) + (1-y)\log(1-\hat{y})\right]
$$

mini-batch 平均 BCE 是：

$$
L_B = -\frac{1}{m}\sum_{i=1}^{m}\left[y_i\log(\hat{y}_i) + (1-y_i)\log(1-\hat{y}_i)\right]
$$

---

## 6. Backward 的核心：误差信号 $\delta$

反向传播最关键的是定义：

$$
\delta^{(l)} = \frac{\partial L}{\partial z^{(l)}}
$$

也就是说，$\delta^{(l)}$ 表示 loss 对第 $l$ 层加权和 $z^{(l)}$ 的导数。

为什么不用 $\frac{\partial L}{\partial a^{(l)}}$？因为参数 $W$ 和 $b$ 是先影响 $z$，再经过激活函数影响 $a$，所以更新参数时最方便的中间量是：

$$
z^{(l)} = W^{(l)}a^{(l-1)} + b^{(l)}
$$

只要知道：

$$
\delta^{(l)} = \frac{\partial L}{\partial z^{(l)}}
$$

就能很容易得到：

$$
\frac{\partial L}{\partial W^{(l)}}
$$

和：

$$
\frac{\partial L}{\partial b^{(l)}}
$$

---

## 7. 输出层 Backward

### 7.1 MSE + Sigmoid

输出层预测：

$$
\hat{y} = a^{(L)} = \sigma(z^{(L)})
$$

MSE loss：

$$
L = \frac{1}{2}(a^{(L)} - y)^2
$$

先对 $a^{(L)}$ 求导：

$$
\frac{\partial L}{\partial a^{(L)}} = a^{(L)} - y
$$

再乘上激活函数导数：

$$
\frac{\partial a^{(L)}}{\partial z^{(L)}} = a^{(L)}(1-a^{(L)})
$$

所以输出层误差信号为：

$$
\delta^{(L)} = (a^{(L)} - y) \odot a^{(L)} \odot (1-a^{(L)})
$$

mini-batch 矩阵形式：

$$
\Delta^{(L)} = (A^{(L)} - Y_B) \odot A^{(L)} \odot (1-A^{(L)})
$$

其中 $\odot$ 表示逐元素相乘。

### 7.2 BCE + Sigmoid

BCE 与 Sigmoid 组合时有一个常见简化。

原始 BCE：

$$
L = -\left[y\log(a) + (1-y)\log(1-a)\right]
$$

如果：

$$
a = \sigma(z)
$$

那么可以推导得到：

$$
\frac{\partial L}{\partial z} = a - y
$$

所以输出层误差信号直接是：

$$
\delta^{(L)} = a^{(L)} - y
$$

mini-batch 矩阵形式：

$$
\Delta^{(L)} = A^{(L)} - Y_B
$$

这就是为什么代码里 BCE 的输出层 delta 比 MSE 更简单。

---

## 8. 隐藏层 Backward

隐藏层没有直接连接 loss，所以它的误差信号来自下一层。

第 $l+1$ 层的加权和是：

$$
z^{(l+1)} = W^{(l+1)}a^{(l)} + b^{(l+1)}
$$

因此第 $l$ 层激活值 $a^{(l)}$ 对下一层所有神经元都有影响。

先把下一层误差信号传回来：

$$
(W^{(l+1)})^{\top}\delta^{(l+1)}
$$

再乘上本层激活函数导数：

$$
\delta^{(l)} = \left((W^{(l+1)})^{\top}\delta^{(l+1)}\right) \odot a^{(l)} \odot (1-a^{(l)})
$$

mini-batch 矩阵形式：

$$
\Delta^{(l)} = \left((W^{(l+1)})^{\top}\Delta^{(l+1)}\right) \odot A^{(l)} \odot (1-A^{(l)})
$$

维度检查：

$$
(W^{(l+1)})^{\top} \in \mathbb{R}^{n_l \times n_{l+1}}
$$

$$
\Delta^{(l+1)} \in \mathbb{R}^{n_{l+1} \times m}
$$

所以：

$$
(W^{(l+1)})^{\top}\Delta^{(l+1)} \in \mathbb{R}^{n_l \times m}
$$

这刚好和：

$$
A^{(l)} \in \mathbb{R}^{n_l \times m}
$$

形状一致，可以逐元素相乘。

---

## 9. 计算权重梯度 $\partial L / \partial W$

先看单样本。

第 $l$ 层中：

$$
z^{(l)}_j = \sum_{k=1}^{n_{l-1}}W^{(l)}_{j,k}a^{(l-1)}_k + b^{(l)}_j
$$

因为：

$$
\delta^{(l)}_j = \frac{\partial L}{\partial z^{(l)}_j}
$$

又有：

$$
\frac{\partial z^{(l)}_j}{\partial W^{(l)}_{j,k}} = a^{(l-1)}_k
$$

所以：

$$
\frac{\partial L}{\partial W^{(l)}_{j,k}} = \delta^{(l)}_j a^{(l-1)}_k
$$

写成矩阵形式，就是一个外积：

$$
\frac{\partial L}{\partial W^{(l)}} = \delta^{(l)}(a^{(l-1)})^{\top}
$$

其中：

$$
\delta^{(l)} \in \mathbb{R}^{n_l \times 1}
$$

$$
(a^{(l-1)})^{\top} \in \mathbb{R}^{1 \times n_{l-1}}
$$

所以：

$$
\delta^{(l)}(a^{(l-1)})^{\top} \in \mathbb{R}^{n_l \times n_{l-1}}
$$

这和 $W^{(l)}$ 的形状完全一致。

---

## 10. mini-batch 的权重梯度

mini-batch 下，每一列样本都会贡献一份梯度。

第 $l$ 层的误差信号矩阵：

$$
\Delta^{(l)} \in \mathbb{R}^{n_l \times m}
$$

上一层激活矩阵：

$$
A^{(l-1)} \in \mathbb{R}^{n_{l-1} \times m}
$$

为了把所有样本的外积加起来，可以做矩阵乘法：

$$
\Delta^{(l)}(A^{(l-1)})^{\top}
$$

维度是：

$$
(n_l \times m)(m \times n_{l-1}) = n_l \times n_{l-1}
$$

这个结果等于 batch 内所有样本梯度之和。取平均后：

$$
\frac{\partial L_B}{\partial W^{(l)}} = \frac{1}{m}\Delta^{(l)}(A^{(l-1)})^{\top}
$$

也可以写作：

$$
G_W^{(l)} = \frac{1}{m}\Delta^{(l)}(A^{(l-1)})^{\top}
$$

其中 $G_W^{(l)}$ 就是用来更新 $W^{(l)}$ 的平均梯度。

---

## 11. 计算偏置梯度 $\partial L / \partial b$

单样本下：

$$
z^{(l)}_j = \sum_{k=1}^{n_{l-1}}W^{(l)}_{j,k}a^{(l-1)}_k + b^{(l)}_j
$$

因为：

$$
\frac{\partial z^{(l)}_j}{\partial b^{(l)}_j} = 1
$$

所以：

$$
\frac{\partial L}{\partial b^{(l)}_j} = \delta^{(l)}_j
$$

向量形式：

$$
\frac{\partial L}{\partial b^{(l)}} = \delta^{(l)}
$$

mini-batch 下，每个样本都有一列 $\Delta^{(l)}$，所以偏置梯度取列平均：

$$
\frac{\partial L_B}{\partial b^{(l)}} = \frac{1}{m}\Delta^{(l)}\mathbf{1}
$$

其中：

$$
\mathbf{1} \in \mathbb{R}^{m \times 1}
$$

也可以写成：

$$
G_b^{(l)} = \operatorname{mean\_cols}(\Delta^{(l)})
$$

---

## 12. 梯度累积与 batch 平均

当前代码的训练过程是：每处理一个样本，先算出这个样本的梯度：

$$
g_{W,i}^{(l)} = \delta_i^{(l)}(a_i^{(l-1)})^{\top}
$$

$$
g_{b,i}^{(l)} = \delta_i^{(l)}
$$

然后把它累加起来：

$$
S_W^{(l)} \leftarrow S_W^{(l)} + g_{W,i}^{(l)}
$$

$$
S_b^{(l)} \leftarrow S_b^{(l)} + g_{b,i}^{(l)}
$$

当累计了 $m$ 个样本后，取平均：

$$
G_W^{(l)} = \frac{S_W^{(l)}}{m}
$$

$$
G_b^{(l)} = \frac{S_b^{(l)}}{m}
$$

然后清空累积器：

$$
S_W^{(l)} \leftarrow 0
$$

$$
S_b^{(l)} \leftarrow 0
$$

---

## 13. 用 SGD 修改 $W$ 和 $b$

最基础的梯度下降是：

$$
\theta_{new} = \theta - \eta G_\theta
$$

其中：

- $\theta$ 表示任意参数，比如 $W^{(l)}$ 或 $b^{(l)}$。
- $\eta$ 是 learning rate。
- $G_\theta$ 是该参数的梯度。

对权重：

$$
W^{(l)}_{new} = W^{(l)} - \eta G_W^{(l)}
$$

对偏置：

$$
b^{(l)}_{new} = b^{(l)} - \eta G_b^{(l)}
$$

如果写成代码中的 update 形式：

$$
\Delta W^{(l)} = -\eta G_W^{(l)}
$$

$$
\Delta b^{(l)} = -\eta G_b^{(l)}
$$

然后：

$$
W^{(l)} \leftarrow W^{(l)} + \Delta W^{(l)}
$$

$$
b^{(l)} \leftarrow b^{(l)} + \Delta b^{(l)}
$$

---

## 14. 用 Momentum 修改 $W$ 和 $b$

Momentum 会记住历史梯度方向，让更新更平滑。

代码里使用的形式是：

$$
v_t = 0.9v_{t-1} + G_\theta
$$

然后：

$$
\Delta \theta = -\eta v_t
$$

最后：

$$
\theta \leftarrow \theta + \Delta \theta
$$

对权重：

$$
v_{W,t}^{(l)} = 0.9v_{W,t-1}^{(l)} + G_W^{(l)}
$$

$$
W^{(l)} \leftarrow W^{(l)} - \eta v_{W,t}^{(l)}
$$

对偏置：

$$
v_{b,t}^{(l)} = 0.9v_{b,t-1}^{(l)} + G_b^{(l)}
$$

$$
b^{(l)} \leftarrow b^{(l)} - \eta v_{b,t}^{(l)}
$$

---

## 15. 用 Adam 修改 $W$ 和 $b$

Adam 同时维护一阶矩和二阶矩。

一阶矩类似 Momentum：

$$
m_t = \beta_1m_{t-1} + (1-\beta_1)G_\theta
$$

二阶矩记录梯度平方：

$$
v_t = \beta_2v_{t-1} + (1-\beta_2)G_\theta^2
$$

当前代码里：

$$
\beta_1 = 0.9
$$

$$
\beta_2 = 0.999
$$

因为 $m_0$ 和 $v_0$ 一开始是 $0$，所以 Adam 会做偏差修正：

$$
\hat{m}_t = \frac{m_t}{1-\beta_1^t}
$$

$$
\hat{v}_t = \frac{v_t}{1-\beta_2^t}
$$

最终更新量：

$$
\Delta \theta = -\eta \frac{\hat{m}_t}{\sqrt{\hat{v}_t}+\epsilon}
$$

代码里：

$$
\epsilon = 10^{-8}
$$

参数更新：

$$
\theta \leftarrow \theta + \Delta \theta
$$

也就是：

$$
W^{(l)} \leftarrow W^{(l)} - \eta \frac{\hat{m}_{W,t}^{(l)}}{\sqrt{\hat{v}_{W,t}^{(l)}}+\epsilon}
$$

$$
b^{(l)} \leftarrow b^{(l)} - \eta \frac{\hat{m}_{b,t}^{(l)}}{\sqrt{\hat{v}_{b,t}^{(l)}}+\epsilon}
$$

---

## 16. 完整训练流程总结

一次 mini-batch 训练可以总结为以下步骤。

### Step 1：准备输入

$$
A^{(0)} = X_B
$$

### Step 2：Forward

对每一层 $l=1,2,\dots,L$：

$$
Z^{(l)} = W^{(l)}A^{(l-1)} + b^{(l)}\mathbf{1}^{\top}
$$

$$
A^{(l)} = \sigma(Z^{(l)})
$$

### Step 3：计算 Loss

MSE：

$$
L_B = \frac{1}{m}\sum_{i=1}^{m}\frac{1}{2}(\hat{y}_i-y_i)^2
$$

BCE：

$$
L_B = -\frac{1}{m}\sum_{i=1}^{m}\left[y_i\log(\hat{y}_i)+(1-y_i)\log(1-\hat{y}_i)\right]
$$

### Step 4：Backward 输出层

MSE：

$$
\Delta^{(L)} = (A^{(L)} - Y_B) \odot A^{(L)} \odot (1-A^{(L)})
$$

BCE：

$$
\Delta^{(L)} = A^{(L)} - Y_B
$$

### Step 5：Backward 隐藏层

对 $l=L-1,L-2,\dots,1$：

$$
\Delta^{(l)} = \left((W^{(l+1)})^{\top}\Delta^{(l+1)}\right) \odot A^{(l)} \odot (1-A^{(l)})
$$

### Step 6：计算梯度

对每一层 $l$：

$$
G_W^{(l)} = \frac{1}{m}\Delta^{(l)}(A^{(l-1)})^{\top}
$$

$$
G_b^{(l)} = \frac{1}{m}\Delta^{(l)}\mathbf{1}
$$

### Step 7：更新参数

SGD：

$$
W^{(l)} \leftarrow W^{(l)} - \eta G_W^{(l)}
$$

$$
b^{(l)} \leftarrow b^{(l)} - \eta G_b^{(l)}
$$

Momentum / Adam 只是把 $G_W^{(l)}$ 和 $G_b^{(l)}$ 先经过动量或自适应缩放，再更新参数。

---

## 17. 最重要的直觉

Forward 是回答：

$$
\text{给定当前 } W,b \text{，模型预测是多少？}
$$

Loss 是回答：

$$
\text{预测和真实标签差多少？}
$$

Backward 是回答：

$$
\text{每个 } W,b \text{ 对这个错误负多少责任？}
$$

梯度更新是回答：

$$
\text{为了让错误变小，} W,b \text{ 应该往哪个方向移动？}
$$

所以整个训练循环就是：

$$
\boxed{\text{Forward} \rightarrow \text{Loss} \rightarrow \text{Backward} \rightarrow \text{Gradient} \rightarrow \text{Update}}
$$
