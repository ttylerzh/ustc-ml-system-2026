# Lab 2: 大模型的性能瓶颈分析

**个人作业 · 占总成绩 20% · 机器学习系统
ISTE6002P.01**

|  **DDL** |
|:---:|
| **第 8 周周一 23:59** |

---

## 1 实验目标 (Objectives)

Lab 1 中，你已经学会了使用 `transformers` 运行 Qwen3 推理，并通过 Prefill / Decode 分段计时初步感受了推理过程中的性能差异。但 Lab 1 回答的是"**有多快**"，而 Lab 2 要回答的是"**为什么慢、慢在哪里**"。

完成本实验后，你应该能够：

1. **掌握 Hook 机制**：使用 `register_forward_pre_hook` / `register_forward_hook` 配合 CUDA Event 精确测量模型内部每个子模块（Attention、FFN、LayerNorm）的 GPU 执行耗时。
2. **掌握 `torch.profiler`**：生成 Chrome Trace 文件，识别 Top-K CUDA Kernel、GPU 利用率与显存变化曲线。
3. **理解 Roofline Model**：手动推导 Attention 和 FFN 在 Prefill / Decode 阶段的算术强度 (Arithmetic Intensity)，判断其处于 Compute-bound 还是 Memory-bound 区域，并与实测数据交叉验证。
4. **建立 KV Cache 的量化认知**：从公式推导到实测验证，理解 KV Cache 如何随序列长度增长，以及它如何约束最大 Batch Size 与最大上下文长度。

---

## 2 实验环境与前置要求 (Environment & Prerequisites)

### 2.1 模型选择

**考虑到同学们算力资源问题，本实验使用 Qwen3-0.6B**（BF16 或 FP8 版本均可）。

### 2.2 前置知识

| 概念 | 简要说明 |
|------|----------|
| **GPU 异步执行** | CPU 向 GPU 发射 Kernel 后立即返回，不等待 GPU 完成。因此 `time.time()` 测量的是 CPU 端发射延迟而非 GPU 实际执行时间。必须使用 `torch.cuda.Event` 或 `torch.cuda.synchronize()` 获取真实 GPU 耗时。 |
| **Roofline Model** | 以算术强度（FLOPs / Bytes）为横轴、可达算力为纵轴的性能上界模型。当算术强度低于拐点 (Ridge Point) 时，性能受限于**显存带宽**（Memory-bound）；高于拐点时受限于**计算单元**（Compute-bound）。 |
| **Hook 机制** | PyTorch 提供的 `register_forward_pre_hook` / `register_forward_hook` 允许在模块的 `forward()` 前后插入自定义回调函数，可用于无侵入式的性能埋点。 |
| **KV Cache** | Decoder 推理时，已计算过的 Key/Value 张量会被缓存以避免重复计算。其显存占用随序列长度线性增长，是限制长上下文推理的关键因素。 |

---

## 3 实验内容 (Tasks & Instructions)

---

### Task 1：基于 Hook 的逐模块延迟剖析 (Module-Level Latency Profiling)（30 分）

#### 目标

在 Lab 1 中，你测量的是整个 Prefill / Decode 的端到端耗时。现在请深入到 **每一层 Decoder Layer 内部**，分别测量以下子模块的 GPU 执行时间：

- **Self-Attention**（包含 QKV Projection、Attention Score 计算、Output Projection）
- **FFN / MLP**（包含 Gate Projection、Up Projection、Down Projection）
- **LayerNorm**（RMSNorm）
- **其他**（残差连接等）

#### 方法指引

**Step 1：实现基于 CUDA Event 的 Hook 计时器**

```python
import torch

class CudaEventTimer:
    """使用 CUDA Event 在 Hook 中精确计时的工具类"""
    def __init__(self):
        self.records = {}  # {module_name: [elapsed_ms, ...]}
        self._start_events = {}

    def pre_hook(self, name):
        def hook_fn(module, input):
            event = torch.cuda.Event(enable_timing=True)
            event.record()
            self._start_events[name] = event
        return hook_fn

    def post_hook(self, name):
        def hook_fn(module, input, output):
            end_event = torch.cuda.Event(enable_timing=True)
            end_event.record()
            if name not in self.records:
                self.records[name] = []
            self.records[name].append(
                (self._start_events[name], end_event)
            )
        return hook_fn
```

> **为什么不用 `time.time()`？** 因为 GPU 执行是异步的。CPU 端 `time.time()` 记录的是 CUDA Kernel **发射** 的时刻，而非 Kernel 在 GPU 上 **完成** 的时刻。`torch.cuda.Event` 直接在 GPU 的执行流 (Stream) 中打时间戳，配合最后的 `torch.cuda.synchronize()` 才能获得真实耗时。

**Step 2：注册 Hook**

遍历模型的所有 Decoder Layer，为其中的 `self_attn`、`mlp`、`layernorm` 子模块分别注册 pre_hook 和 post_hook。

> **提示**：可以使用 `model.named_modules()` 遍历模型结构，找到目标子模块并注册 Hook。建议先 `print` 模型结构观察命名规律。

**Step 3：分别在 Prefill 和 Decode 阶段运行**

- **Prefill 阶段**：使用固定长度的输入（如 512 tokens），执行一次 `model.forward()`，收集各模块耗时。
- **Decode 阶段**：在 Prefill 完成后，执行 128 步 Decode（逐 token 生成），收集各模块**每步**的耗时并取均值。

**Step 4：可视化**

请绘制以下图表（至少完成前两项）：

| 图表编号 | 类型 | 内容 |
|----------|------|------|
| **图 1** | 堆叠柱状图 | 横轴为 Layer 编号 (0 ~ N-1)，每根柱子由 Attention / FFN / LayerNorm / Other 四色堆叠组成，展示 **Prefill 阶段** 各层的耗时分解 |
| **图 2** | 堆叠柱状图 | 同上，展示 **Decode 阶段** 各层的耗时分解 |
| **图 3** | 饼图或百分比条形图 | 将所有层汇总，分别展示 Prefill 和 Decode 阶段中 Attention vs FFN vs LayerNorm vs Other 的**全局耗时占比** |

#### 分析要求

请在报告中回答以下问题：

1. 在 Prefill 阶段，Attention 和 FFN 各自占比约多少？哪一个是主要耗时来源？
2. 在 Decode 阶段，比例是否发生变化？如果变化了，请解释为什么。
3. 各层之间的耗时是否一致？如果有差异（如第 0 层与其他层不同），请分析可能的原因。
4. LayerNorm 的耗时占比大约是多少？它是否可以被忽略？

---

### Task 2：使用 `torch.profiler` 进行 Kernel 级分析（20 分）

#### 目标

Hook 给出了**模块级**的耗时分解。现在请使用 `torch.profiler` 进一步下探到 **CUDA Kernel 级别**，了解 GPU 上到底在跑哪些算子、各算子耗时如何。

#### 方法指引

**Step 1：使用 `torch.profiler` 包裹推理过程**

```python
from torch.profiler import profile, ProfilerActivity, schedule, tensorboard_trace_handler

with profile(
    activities=[ProfilerActivity.CPU, ProfilerActivity.CUDA],
    schedule=schedule(wait=1, warmup=1, active=3, repeat=1),
    on_trace_ready=tensorboard_trace_handler("./profiler_logs"),
    record_shapes=True,
    profile_memory=True,
    with_stack=True
) as prof:
    for step in range(6):
        # 执行一次推理（Prefill 或 Decode）
        ...
        prof.step()
```

**Step 2：导出并分析 Trace**

- 使用 `https://ui.perfetto.dev/` ,点击页面左上角的 "Open trace file", 选择你跑完程序生成的 trace 文件，查看 GPU/CPU timeline 细节图

**Step 3：输出 Top-10 CUDA Kernel 表格**

```python
print(prof.key_averages().table(sort_by="cuda_time_total", row_limit=10))
```

#### 分析要求

请在报告中包含以下内容：

1. **Top-10 Kernel 表格**：列出 Prefill 阶段和 Decode 阶段各自耗时最长的 10 个 CUDA Kernel 名称及其耗时占比。
2. **截图**：附一张 Trace 的 timeline 可视化截图，标注出关键区域。
3. **分析**：
   - Prefill 阶段中，`GEMM`（矩阵乘法）类 Kernel 占总 GPU 时间的比例约为多少？这与 Compute-bound 的预期是否一致？
   - Decode 阶段中，是否观察到大量的 **memory copy / elementwise** 类 Kernel？这与 Memory-bound 的预期是否一致？
   - 是否存在你意料之外的高耗时 Kernel？如果有，请尝试分析其来源。

---

### Task 3：Roofline Model 理论分析与实测验证（30 分）

#### 目标

需要**手动推导** Attention 和 FFN 在不同阶段的算术强度，在 Roofline 图上标注它们的位置，并与 Task 1 的实测数据进行交叉验证。

#### 背景：针对你的 GPU 的 Roofline

请根据你的 GPU 型号查阅以下两个参数：

| 参数 | 符号 | 含义 | 示例 (A100 80GB SXM) |
|------|------|------|----------------------|
| 峰值算力 | $\pi$ | BF16 Peak FLOPS | 312 TFLOPS |
| 显存带宽 | $\beta$ | HBM Bandwidth | 2039 GB/s |

**Ridge Point**（拐点）= $\pi / \beta$，即算术强度达到该值时，性能从 Memory-bound 切换为 Compute-bound。

> 对于 A100：Ridge Point ≈ 312 / 2.039 ≈ **153 FLOPs/Byte**

#### Part A：FFN (SwiGLU MLP) 的 Roofline 分析

Qwen3 的 FFN 采用 SwiGLU 结构，包含三个线性变换：

$$\text{FFN}(x) = \left(\text{SiLU}(xW_{\text{gate}}) \odot xW_{\text{up}}\right) W_{\text{down}}$$

设输入 token 数为 $B \times S$（Prefill 阶段）或 $B \times 1$（Decode 阶段），隐藏维度为 $d$，FFN 中间维度为 $d_{\text{ff}}$，使用 BF16（2 Bytes/element）。

**请推导以下内容并填表：**

| 项目 | Prefill ( $B=1, S=512$ ) | Decode ($B=1, S=1$) |
|------|:-----------------------:|:-------------------:|
| Token 数 $N$ | $512$ | $1$ |
| FLOPs（三个矩阵乘的总计算量）| $\approx 3 \times 2Nd \cdot d_{\text{ff}}$ | $\approx 3 \times 2d \cdot d_{\text{ff}}$ |
| Bytes（权重加载 + 激活读写）| | |
| 算术强度 (FLOPs/Byte) | | |
| 所在区域 | Compute / Memory ? | Compute / Memory ? |

> **提示**：
> - 每次矩阵乘的 FLOPs ≈ $2 \times M \times N \times K$（ $M$ 行 $\times$ $K$ 列的矩阵乘以 $K$ 行 $\times$ $N$ 列的矩阵）
> - Bytes 需要考虑：权重读取（三个权重矩阵各 $d \times d_{\text{ff}} \times 2$ Bytes）+ 输入/输出激活的读写
> - Decode 阶段 $N=1$ 时，Bytes 被权重读取主导（因为权重大小与 $N$ 无关），算术强度会非常低

#### Part B：Self-Attention 的 Roofline 分析

Attention 的计算包含 QKV Projection、 $QK^T$ Score 计算、Softmax、 $\text{Score} \times V$ 、Output Projection。

**请推导以下内容并填表：**

| 项目 | Prefill ( $B=1, S=512$ ) | Decode ( $B=1, S=1$, KV Cache 长度= $L$ ) |
|------|:-----------------------:|:--------------------------------------:|
| QKV Projection FLOPs | | |
| Attention Score $QK^T$ FLOPs | | |
| $\text{Score} \times V$ FLOPs | | |
| Output Projection FLOPs | | |
| 总 FLOPs | | |
| 总 Bytes（权重 + KV Cache 读取 + 激活）| | |
| 算术强度 | | |
| 所在区域 | Compute / Memory ? | Compute / Memory ? |

> **提示**：
> - Decode 阶段需要从 KV Cache 中读取历史所有 Key 和 Value 张量，这部分 Bytes 随上下文长度 $L$ 线性增长
> - 注意 Qwen3 是否使用了 GQA（Grouped Query Attention），如果 `num_key_value_heads < num_attention_heads`，KV Cache 的大小会相应减小

#### Part C：绘制 Roofline 图

请绘制一张 Roofline 图（log-log 坐标系），包含以下元素：

1. 你的 GPU 的 Roofline 上界线（Memory-bound 斜线 + Compute-bound 水平线）
2. 四个标注点：FFN-Prefill、FFN-Decode、Attn-Prefill、Attn-Decode
3. Ridge Point 标注

#### Part D：与实测数据交叉验证

将 Task 1 中实测的各模块耗时换算为**实际达到的算力** (Achieved FLOPS)：
$$
\text{Achieved FLOPS}=\frac{\text{Theoretical FLOPs}}{\text{Measured time (s)}}
$$

在 Roofline 图中将实测点一并标注，观察其是否落在理论上界线附近。如果偏离较大，请分析可能的原因（如 Kernel 启动开销、内存碎片、Padding 等）。

---

### Task 4：KV Cache 显存建模与验证（20 分）

#### 目标

KV Cache 是制约 LLM 长上下文推理和大 Batch 部署的核心显存瓶颈。请从理论推导出发，精确建模 KV Cache 的显存占用，并与实测数据进行对比验证。

#### Part A：理论推导

Qwen3-0.6B 的关键配置参数（请从模型 `config.json` 中确认实际值）：

| 参数 | 符号 | 值 |
|------|------|-----|
| 隐藏层数 | $n_{\text{layers}}$ | 请查阅 |
| KV Head 数 | $n_{\text{kv heads}}$ | 请查阅 |
| Head 维度 | $d_{\text{head}}$ | $= d_{\text{model}} / n_{\text{heads}}$ |
| 数据精度 | $b$ | 2 Bytes (BF16) |

**单个 Token 的 KV Cache 占用：**

$$\text{KV}_{\text{per token}} = 2 \times n_{\text{layers}} \times n_{\text{kv heads}} \times d_{\text{head}} \times b \quad (\text{Bytes})$$

> 因子 2 来自 Key 和 Value 各一份。

**给定序列长度 $L$ 和 Batch Size $B$ 的总 KV Cache 占用：**

$$\text{KV}_{\text{total}} = B \times L \times \text{KV}_{\text{per token}} \quad (\text{Bytes})$$

**请填写以下理论预测表（假设 BF16）：**

| Batch Size | 序列长度 $L$ | KV Cache 理论值 (MB) |
|:----------:|:-----------:|:-------------------:|
| 1 | 512 | |
| 1 | 1024 | |
| 1 | 2048 | |
| 1 | 4096 | |
| 4 | 1024 | |
| 8 | 1024 | |

#### Part B：实测验证

编写代码，在不同序列长度下完成 Prefill，并测量 `past_key_values` 的实际显存占用。

> **提示**：可以通过遍历 `past_key_values` 中的 Tensor，累加 `tensor.element_size() * tensor.nelement()` 来精确计算实际 KV Cache 大小。也可以对比 Prefill 前后的 `torch.cuda.memory_allocated()` 差值（但需要注意其中可能包含激活值等额外开销）。

请在报告中以表格呈现**理论值与实测值的对比**，并计算误差百分比。如果存在显著偏差，请分析原因。

#### Part C：最大服务容量估算

假设你的 GPU 总显存为 $M_{\text{GPU}}$ GB，模型权重占用 $M_{\text{model}}$ GB，运行时激活开销约为 $M_{\text{act}}$ GB（可取一个估计值或实测值），则可用于 KV Cache 的显存为：

$$M_{\text{KV}} = M_{\text{GPU}} - M_{\text{model}} - M_{\text{act}}$$

请计算以下场景下的最大可服务配置：

1. 当上下文长度固定为 **4096** 时，最多支持多大的 Batch Size？
2. 当 Batch Size 固定为 **8** 时，最长支持多大的上下文长度？
3. 如果要同时支持 **Batch=16, 上下文=8192**，至少需要多少显存？当前 GPU 是否满足？

---

---

## 4 提交要求 (Submission Guidelines)

### 代码

| 文件 | 说明 |
|------|------|
| `hook_profiler.py` | Task 1：Hook 计时器实现与逐模块延迟测量 |
| `torch_profiler_run.py` | Task 2：torch.profiler 脚本 |
| `roofline_analysis.py` | Task 3：Roofline 计算与绘图脚本 |
| `kv_cache_analysis.py` | Task 4：KV Cache 理论计算与实测验证 |
| `requirements.txt` 或 `environment.yml` | 环境依赖 |
| `README.md` | 复现步骤与模型路径配置说明 |

### 实验报告（PDF）

| 章节 | 内容要求 |
|------|----------|
| 1 实验环境 | GPU 型号与显存 |
| 2 实验数据 | 各 Task 图表与结果分析 |
| 3 总结与思考 | 结合四个 Task 的结果，综合分析 Dense LLM 单卡推理的核心性能瓶颈 |

---

## 5 评分标准 (Grading Rubric)

**满分 100 分（折合总成绩 20%）**

| 维度 | 分值 | 评分细则 |
|------|:----:|----------|
| **Task 1：Hook 逐模块延迟剖析** | **30** | |
| 　├ Hook 计时代码实现正确，使用 CUDA Event | 10 | 代码可运行，计时方法正确（非 `time.time()`），Hook 注册覆盖 Attention / FFN / LayerNorm |
| 　├ Prefill & Decode 均完成测量，图表完整 | 10 | 图 1 ~ 图 3 至少完成两张，数据合理 |
| 　└ 分析问题回答 | 10 | 四个问题均有回答，结论有数据支撑，能解释 Prefill 与 Decode 阶段差异的原因 |
| **Task 2：torch.profiler 分析** | **20** | |
| 　├ 正确使用 profiler 并输出结果 | 8 | 代码可运行，能生成 Trace 文件或文字报告 |
| 　├ Top-10 Kernel 表格完整 | 6 | Prefill 和 Decode 各一份，包含 Kernel 名称与耗时占比 |
| 　└ Kernel 分析有见解 | 6 | 能将 Kernel 类型与 Compute/Memory-bound 理论对应，分析合理 |
| **Task 3：Roofline 分析** | **30** | |
| 　├ FFN 算术强度推导正确 | 8 | 推导正确，Prefill / Decode 两种场景均完成 |
| 　├ Attention 算术强度推导正确 | 8 | 推导正确，考虑了 GQA（如模型采用）和 KV Cache 读取 |
| 　├ Roofline 图绘制规范 | 7 | 上界线正确、理论点和 Ridge Point 标注 |
| 　└ 与实测数据交叉验证 | 7 | 计算 Achieved FLOPS 并在 Roofline 图中标注，偏差分析合理 |
| **Task 4：KV Cache 分析** | **20** | |
| 　├ 理论公式推导正确 | 6 | 公式完整，参数值正确从 config 中获取 |
| 　├ 理论 vs 实测对比完整 | 8 | 表格包含至少 4 组配置，误差百分比计算正确，偏差有解释 |
| 　└ 最大服务容量计算 | 6 | 三个场景均完成计算，逻辑清晰 |

---

**提交方式**：代码文件 + PDF 上传至研究生综合服务平台: https://yjs1.ustc.edu.cn/

**提交格式**：`学号_姓名_lab2.zip`

---
