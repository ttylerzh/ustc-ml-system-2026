# Lab 3: 基于 vLLM 的 Prefill/Decode 调度策略实现

**个人作业 · 占总成绩 20% · 机器学习系统
ISTE6002P.01**

|  **DDL** |
|:---:|
| **第 15 周周日 23:59** |              

---


## 1 实验目标


1. **理解并使用 vLLM**：掌握 PagedAttention、Continuous Batching 等核心机制，理解 vLLM 相对于 naive transformers 的吞吐优势。
2. **动手改造 vLLM 调度器**：阅读 vLLM V1 Scheduler 源码，实现至少一种自定义调度策略，并在真实负载上跑出端到端数据。

---

## 2 实验环境与前置要求

### 2.1 模型与硬件

- **模型**：显存小可用 **Qwen3-0.6B**，或其他前面实验大家已经下载了权重的
- **硬件**：单卡 GPU 即可（16 GB 及以上显存更佳）。若只有 8 GB 显存，推荐 0.6B 模型并将 `--max-model-len` 限制在 2048 以内。

### 2.2 软件环境

| 组件 | 推荐版本 | 安装方式 |
|------|----------|----------|
| Python | 3.10 – 3.12 | conda |
| PyTorch | 与 vLLM 匹配的版本 | `pip install torch` |
| vLLM | **>= 0.8.0** | `pip install vllm` |
| 其他 | `numpy`, `pandas`, `matplotlib`, `aiohttp` | `pip install ...` |

> 安装后用 `python -c "import vllm; print(vllm.__version__)"` 确认版本。**本实验所有源码路径、类名均以 V1 Scheduler 为准**。

### 2.3 前置知识

| 概念 | 简要说明 |
|------|----------|
| **Continuous Batching** | 在每个 decode step 都重新决策 batch 成员。请求一完成就被移出，新请求一到就被加入，GPU 永远满载。 |
| **PagedAttention** | 将 KV Cache 切成固定大小的物理 block，通过 block table 实现虚拟到物理的映射。显存碎片率从 60%+ 降到 <4%。 |
| **Chunked Prefill** | 将大 prompt 的 prefill 切成若干 chunk，与 decode 请求混批。chunk 大小由 `max_num_batched_tokens` 控制——本实验最重要的调度旋钮。**vLLM V1 默认 decode 优先，剩余 budget 跑 chunked prefill**。 |
| **TTFT / ITL** | TTFT (Time to First Token) ≈ Lab 1 的 prefill 耗时 + 排队等待；ITL (Inter-Token Latency) ≈ Lab 1 的 TBT。多请求场景下要看 P50 / P99，不能只看平均。 |

---

## 3 实验内容

---

### Task 1：从 transformers 到 vLLM —— 吞吐量差异（30 分）

#### 目标

直观感受 vLLM 的 Continuous Batching + PagedAttention 相对于 Lab 1 中 `transformers` 朴素 `model.generate()` 的吞吐优势，并解释差距来源。

#### 方法指引

**Step 1：构造一个并发负载**

准备 64 条 prompt（可从 ShareGPT 采样或自己生成），输入长度在 128–512 之间随机，输出 `max_new_tokens=128`。

**Step 2：Baseline —— 朴素 transformers（复用 Lab 1 脚本）**

- 方案 A：**串行**提交 64 条（for 循环调用 `generate`），记录总耗时。
- 方案 B：**padding 静态 batching**，将 64 条填充到同长度，一次性 `generate`，记录总耗时（batch 过大会 OOM，此时报告你能塞进显存的最大 batch）。

**Step 3：vLLM 离线推理**

```python
from vllm import LLM, SamplingParams

llm = LLM(model="Qwen/Qwen3-0.6B", gpu_memory_utilization=0.9)
sampling = SamplingParams(temperature=0.0, max_tokens=128)
outputs = llm.generate(prompts, sampling)  # 一次性提交 64 条
```

记录端到端耗时与峰值显存。

**Step 4：填表对比**

| 方案 | 总耗时 (s) | Throughput (tokens/s) | 峰值 KV cache (MB) | 备注 |
|------|:---------:|:---------------------:|:------------------:|------|
| transformers 串行 | | | | |
| transformers 静态 batching (batch=?) | | | | |
| vLLM 离线 | | | | |

##### 测量方法

per-token KV 字节由 model config 决定（与框架无关）：
```
per_token_KV_bytes = 2 (K+V) × num_hidden_layers × num_key_value_heads × head_dim × dtype_bytes
```
Qwen3-0.6B FP16 ≈ `2 × 28 × 8 × 128 × 2 = 114688 bytes ≈ 112 KB / token`。

- **transformers（串行 / 静态 batch）—— 解析公式，最简单也最精确：**
  - 串行 (b=1)：`peak = max_i(input_len_i + 128) × per_token_KV_bytes`，整个 run 内每条独立分配释放，峰值取最长那条。
  - 静态 batch (b=B, padding 后 max_seq_len=L)：`peak = B × L × per_token_KV_bytes`。**这里包含 padding 浪费**——这是它跟 vLLM 真正的差距来源。
- **vLLM —— 通过 scheduler 回调读 metrics：**
  - 离线 `LLM(...)` 模式下没有 `/metrics` HTTP 端点，可继承 `vllm.v1.core.sched.scheduler.Scheduler`，在 `schedule()` 内每步累加 `sum(req.num_computed_tokens for req in self.running)`，记录最大值后把它写入文件供主进程读取。
  - 在线 `vllm serve` 模式（Task 2/3 是使用在线vllm）：可以直接 `curl http://host:port/metrics | grep vllm:gpu_cache_usage_perc`（表示当前实际已使用的 KV Cache 空间占整个 GPU KV Cache 容量的比例），再乘以 `GPU KV cache size` (启动日志中那个 token 数)表示实际使用的 KV Cache，进一步可用`peak_bytes = peak_tokens × per_token_KV_bytes`换算成字节表示。

#### 分析要求

1. vLLM 相对 transformers 的吞吐提升倍数是多少？
2. transformers 静态 batching 显存容易OOM的根本原因是什么？**PagedAttention 如何解决这个问题？**（请结合 KV Cache 显存碎片化分析）
3. 在静态 batching 下，一条短请求早早生成完后，它占据的 GPU 资源处于什么状态？Continuous Batching 如何避免这种浪费？

---

### Task 2：vLLM 调度器的重要参数（30 分）

#### 目标

vLLM V1 调度器默认开启 chunked prefill，`max_num_batched_tokens` 是其最重要的参数之一（表每step的token预算，决定每步 forward 处理多少 token），直接影响 TTFT / ITL / Throughput 等重要指标。

#### 使用 vLLM 官方压测工具

```bash
# Terminal 1: 启动 vLLM server
vllm serve Qwen/Qwen3-0.6B \
  --max-num-batched-tokens 2048 \
  --max-num-seqs 256 \
  --gpu-memory-utilization 0.9

# Terminal 2: 压测（新命令）
vllm bench serve \
  --model Qwen/Qwen3-0.6B \
  --dataset-name random --random-input-len 1024 --random-output-len 256 --seed 42 \
  --num-prompts 1000 \
  --request-rate 16 \
  --save-result
```

> 若你使用的 vLLM 版本不支持 `vllm bench serve`，可改用等价的 Python 模块入口：
> `python -m vllm.entrypoints.cli.main bench serve <args...>`

> `--request-rate` 以 Poisson 过程发送请求；设为 `inf` 即一次性全部塞给服务器（纯吞吐测试）。压测工具输出 TTFT、ITL、E2E Latency 的 P50/P95/P99 与 Throughput。

#### 实验：`max_num_batched_tokens` 

固定以下参数：
- 数据集：`--dataset-name random --random-input-len 1024 --random-output-len 256 --seed 42`
- 请求规模：`--num-prompts 1000`
- **请求速率**：`--request-rate 16`（若你的 GPU 较强或看不出趋势，可提升到 32 或 inf；在报告中说明即可）
- 每组配置跑 2 次取中位数，丢弃前 10% 的 warmup 数据

可尝试 `max_num_batched_tokens ∈ {512, 1024, 2048, 4096, 8192}`，填写下表（具体参数选择不需要一致，只是参考）：

| max_num_batched_tokens | TTFT P50 (ms) | TTFT P99 (ms) | ITL P50 (ms) | ITL P99 (ms) | Throughput (tok/s) |
|:----------------------:|:------------:|:-------------:|:------------:|:------------:|:------------------:|
| 512 | | | | | |
| 1024 | | | | | |
| 2048 | | | | | |
| 4096 | | | | | |
| 8192 | | | | | |

请同时绘制：
- **图 A1**：`max_num_batched_tokens` vs TTFT P50 / TTFT P99 / ITL P50 / ITL P99 折线图（建议 log-x 轴）
- **图 A2**：`max_num_batched_tokens` vs Throughput 折线图

#### 分析要求

1. 曲线是否符合"`max_num_batched_tokens` 越大 TTFT 越低、ITL 越差"的理论预期（因为对于 prefill 阶段，`max_num_batched_tokens` 越大则允许更大的 chunk size，减少了长 prompt 的串行等待次数 → TTFT 降低。对于 decode 阶段，更大的 token budget 意味着每步需要混合处理更多 decode 和新 prefill 请求，单步计算负载加重 → ITL 增加）？若不符，请尝试分析原因。
2. 观察 Throughput 曲线，它是否随 `max_num_batched_tokens` 单调上升？是否存在饱和点？
3. 假设你部署的是面向终端用户的对话服务（用户敏感于 ITL，希望流式输出顺滑），你会选择哪个 `max_num_batched_tokens` 值？请用你的数据作为依据。

---

### Task 3：动手改造 vLLM 调度器（40 分）—— **核心任务**

#### 目标

真正理解调度器，本 Task 需要**替换 vLLM V1 的 Scheduler**，实现 1 个必做策略 + 1 个自设计策略，并与默认策略对比。

---

#### 3.1 Scheduler 源码（感兴趣可自行阅读了解默认调度器设计，不用写在报告中）

V1 Scheduler 入口位于 `vllm/v1/core/sched/scheduler.py`，关键类为 `Scheduler`，核心方法是 **`schedule() -> SchedulerOutput`**，每个调度步被 `EngineCore` 调用一次。其职责大致是：

1. 遍历 `self.running`（正在 decode 的请求）与 `self.waiting`（排队中的请求）
2. 按某种策略选出这一步要跑的请求集合，并决定每个请求处理多少 token（decode 只跑 1 个 token；prefill 可跑 1 到 chunk_size 个 token）
3. 调用 `KVCacheManager` 为它们分配 block
4. 返回 `SchedulerOutput`，由 `ModelRunner` 执行一次 forward

> vLLM V1 预留了**自定义 scheduler 注入点**：`SchedulerConfig.scheduler_cls` 字段可直接传一个类（或 `"mod.submod.MyScheduler"` 字符串），所以你**不需要 fork vLLM 源码**，只需继承 `vllm.v1.core.sched.scheduler.Scheduler` 并覆写 `schedule()`来设计你自己的调度器。


---

#### 3.2 调度策略实验要求

请实现：
- **必做策略 A**：Step-Exclusive Prefill-First（必须实现）
- **自设计策略 B**：从下面 B1/B2/B3/B-pure-decode 四个候选中**任选一个**，或自创策略

##### 必做策略 A：Step-Exclusive Prefill-First（TTFT 优化型）

**行为**：每个调度步判断：
- 如果 waiting 队列非空 → **只调度 prefill**（不混入 decode），按 token budget 一次塞尽量多的完整 prompt
- 否则 → **只调度 decode**

**实现提示**：
- 在 `schedule()` 入口判断 `len(self.waiting) > 0`，当有等待队列（waiting 非空）时，临时隐藏 running 队列（设为空列表），调用父类调度器 → 此时父类只能看到 prefill 请求，所以这一整步只做 prefill
- 一步只产出**纯 prefill batch** 或 **纯 decode batch**，没有混合

**预期现象**：TTFT 低（新请求一来就被处理），但 ITL 严重恶化（decode 被长 prefill 整体阻塞），且 GPU 利用率低（因为decode是访存密集，prefill是计算密集，默认的混合调度通过任务类型互补可填充 pipeline 的气泡）。

##### 自设计策略 B：四选一 / 自创

| 难度 | 候选 | 简述 | 实现提示 |
|:---:|:---|:---|:---|
| ★ | **B1 · SJF (Shortest-Job-First)** | waiting 队列按 prompt 长度从短到长排序 | 在 super().schedule() 之前对 self.waiting 排序即可 |
| ★ | **B-pure-decode · Pure Decode-First** | running 不空就只跑 decode，绝不混批 prefill | 与策略 A 相反：waiting 让位给 running |
| ★★ | **B2 · Fair-Share** | 每个请求维护"已消耗 token 数"计数，每步优先调度消耗最少的 | 维护一个 dict，每步调度后更新，按计数排序 |
| ★★★ | **B3 · Adaptive Chunk-Size** | 动态调整 prefill chunk 大小：running 空时放大（降 TTFT），running 拥挤时缩小（保 ITL） | 需要修改 token budget 在 prefill 与 decode 之间的分配，通过每step主动不跑满预算，以换取更好的TTFT和ITL的平衡|


> **也允许完全自创策略**（例如：结合 prompt 长度与等待时间的加权调度），若是自创请在报告里清楚说明设计动机。
---

#### 3.3 参考代码

vLLM V1 的 `Scheduler.schedule()` 涵盖 KV Cache 分配、prefix caching、preemption 等多种边界情况。**直接从零覆写 `schedule()` 既不必要也不现实**。

##### 推荐方式：继承默认 `schedule()` 并覆写

如果你的策略本质是**改变请求队列的顺序**或**调整 token budget 分配**，那么不需要重写整个 `schedule()`。只需在 `super().schedule()` 调用前**修改 `self.waiting` / `self.running` 队列状态**，让父类的默认调度器按你期望的顺序工作即可。

```python
# my_scheduler.py
import logging
from vllm.v1.core.sched.scheduler import Scheduler
from vllm.v1.core.sched.output import SchedulerOutput

logger = logging.getLogger(__name__)


class StepExclusivePrefillFirstScheduler(Scheduler):
    """策略 A:  prefill-first.

    每步判断: waiting 非空时只调度 prefill, 否则只调度 decode.
    通过临时清空 self.running 实现"本步只 prefill"的效果.
    """
    def schedule(self) -> SchedulerOutput:
        if len(self.waiting) > 0:
            # 本步只跑 prefill: 临时把 running 移走, 阻止默认 schedule() 调度 decode
            saved_running = self.running
            self.running = []
            try:
                output = super().schedule()
            finally:
                # 恢复 running 队列, 不影响后续步骤的状态机
                self.running = saved_running + self.running
            logger.info(f"[Strategy A] PREFILL step, scheduled={output.num_scheduled_tokens}")
            return output
        else:
            output = super().schedule()
            logger.info(f"[Strategy A] DECODE step, scheduled={output.num_scheduled_tokens}")
            return output


class SJFScheduler(Scheduler):
    """策略 B1: 短作业优先. 在调度前对 waiting 队列按 prompt 长度排序."""
    def schedule(self) -> SchedulerOutput:
        # 注意 self.waiting 的具体类型可能是 deque 或 RequestQueue, 排序方式要看实际实现
        sorted_waiting = sorted(self.waiting, key=lambda r: r.num_prompt_tokens)
        self.waiting.clear()
        self.waiting.extend(sorted_waiting)
        return super().schedule()
```

> **提示**：`self.waiting` 的具体类型在不同 vLLM 版本中可能是 `collections.deque`、`RequestQueue`，或者支持 priority 的子类，可以先 `print(type(self.waiting))` 确认其接口。

##### 启动你的 Scheduler

```bash
vllm serve Qwen/Qwen3-0.6B \
  --scheduler-cls my_scheduler.StepExclusivePrefillFirstScheduler \
  --max-num-batched-tokens 2048 \
  --max-num-seqs 256 \
  --gpu-memory-utilization 0.9
```

> 若 `--scheduler-cls` CLI 参数在你的 vLLM 版本不可用，可在 Python API 侧通过 `EngineArgs(scheduler_cls="my_scheduler.StepExclusivePrefillFirstScheduler", ...)` 传入。

---

#### 3.4 实验要求

##### 实验配置

为防止极端策略（如策略 A）在高负载下直接把系统打挂，可采用**较温和的负载**：

- 数据集：`--dataset-name random --random-input-len 1024 --random-output-len 256 --seed 42`
- 请求规模：`--num-prompts 1000`
- 请求速率：`--request-rate 8`（给极端策略留出适应空间）
- 客户端超时：vLLM 0.20+ 的 `vllm bench serve` 已不支持 `--request-timeout`；如需限制单请求等待时长，可通过 HTTP 客户端层面（例如包一层 `aiohttp` 或 `--max-concurrency` + 请求级 timeout）实现，或直接在分析中按 e2e P99 截断

**重要**：若有请求超时（特别是策略 A 在压力下 ITL 爆炸），**请在分析中明确报告超时数量与超时率，不要剔除超时数据**——它本身就是策略缺陷的关键证据。

##### 主对比表

测试 **3 种策略**（vLLM V1 默认 + 必做策略 A + 自设计策略 B（选一种即可）），填表：

| 策略 | TTFT P50 (ms) | TTFT P99 (ms) | ITL P50 (ms) | ITL P99 (ms) | Throughput (tok/s) | 超时数 |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| vLLM V1 默认 | | | | | | |
| 策略 A: Step-Exclusive Prefill-First | | | | | | |
| 策略 B: 自设计 | | | | | | |

##### 绘制图表

**图 3A**：三种策略的 **TTFT CDF（（累积分布函数））** 与 **ITL CDF** 叠加图，因为 CDF 比 P50/P99 两个数字更能暴露长尾问题。

> **提示**：`vllm bench serve` 默认只在结果 JSON 中保存 P50/P99 标量；如需绘 CDF，必须额外加 `--save-detailed`，JSON 才会包含每条请求的 `ttfts` / `itls` 数组（注意：保存的单位是**秒**，绘图时可换成 ms）。

---

#### 3.5 分析要求

1. **策略 A 的代价**：策略 A 与 V1 默认相比，TTFT 改善了多少？代价是 ITL 恶化了多少倍？请用一两句话解释 V1 默认的"chunked prefill 混批"为什么能在 ITL 上明显胜过策略 A 。
2. **策略 B 的设计与权衡**：自设计的策略 B 在哪个指标上取得了优势？为了这个优势付出了什么代价？可结合图 3A 的 CDF 曲线分析。

---

## 4 提交要求

### 4.1 代码

| 文件 / 目录 | 说明 |
|------|------|
| `task1_vllm_vs_hf.py` | Task 1：transformers 串行 / 静态 batching / vLLM 离线 三方案的吞吐对比脚本 |
| `task2.sh` | Task 2：扫描 `max_num_batched_tokens` 的自动化脚本 |
| `my_scheduler.py` | Task 3：必做策略 A + 自设计策略 B 的 Scheduler 实现，还可以有Task 1用来检测KV cache的调度器 |
| `task3.sh` | Task 3：3 种策略的自动化压测脚本 |
| `requirements.txt` | 环境依赖，**需明确写出 vLLM 版本号** |
| `README.md` | 硬件 / 软件环境 + **完整一键复现命令** |

### 4.2 实验报告 (PDF)

| 章节 | 内容要求 |
|------|----------|
| **1 实验环境** | GPU 型号与显存、所选模型 |
| **2 Task 1 结果** | 吞吐量对比表 + 分析问题 |
| **3 Task 2 结果** | 不同参数性能对比 + 图 A1/A2 + 分析问题 |
| **4 Task 3 结果** | 必做策略A + 自设计策略 B 的动机与选择 + 主对比表 + 图 3A + 分析问题|
| **5 总结与思考** | 简要总结通过本次实验你对 LLM 推理系统性能栈的整体认识|

---

## 5 提示

1. 推荐大家合成负载 (`--dataset-name random`)来测试。
2. **`--scheduler-cls` 参数报错**：确认 vLLM 版本 ≥ 0.8；旧版可用 Python API 传 `EngineArgs(scheduler_cls=...)`。
3. **自定义 Scheduler 报字段缺失**：建议使用 3.3 节的方式而不是从零构造 `SchedulerOutput`。
4. **显存 OOM**：可根据自己的显存降低 `--max-model-len` 或 `--max-num-seqs`，或调低 `--gpu-memory-utilization`。
5. **TTFT / ITL 波动大**：压测前可用 `--num-prompts 50 --request-rate 1` 做一次 warm-up。
6. **看不到拐点 / 各组数据差不多**：可能是你的 GPU 性能太强，负载没把系统压到极限，可提高 `--request-rate` 或减小 `--gpu-memory-utilization` 人为制造 KV Cache 紧张。
7. **`vllm bench serve` 结果 JSON 没有 `ttfts` / `itls` 数组**：默认只存 P50/P99 标量，绘 CDF 时务必加 `--save-detailed`；默认的保存值为**秒**。

---

**提交方式**：代码文件 + PDF 上传至研究生综合服务平台: https://yjs1.ustc.edu.cn/

**提交格式**：`学号_姓名_lab3.zip`
