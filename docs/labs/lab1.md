# Lab 1: 大模型qwen3 部署 

**个人作业 · 占总成绩 10% · 机器学习系统`ISTE6002P.01`**


|  **DDL** | 
|:---:|
| **第 5 周周一(3.30) 23:59** |

---

## 1 实验目标

- 独立使用 `transformers` 运行 Qwen3，理解从输入文本到生成文本的完整链路
- 手动拆分 **Prefill** / **Decode** 两阶段并分别计时
- 分析输入长度、输出长度、batch size 对推理性能的影响规律

---

## 2 背景知识

| 阶段 | 计算特征 | 瓶颈所在 |
|------|----------|----------|
| **Prefill** | 并行处理全部输入 token，计算 KV Cache。**Compute-bound**，GPU 利用率高。 | 计算量随输入长度线性增长 → TTFT 上升 |
| **Decode** | 每步只生成 1 个 token，但需读取完整 KV Cache。**Memory-bound**，计算单元长期闲置。 | 内存带宽 & KV Cache 大小 → TBT 瓶颈 |

**性能指标说明：**

- **TTFT**（Time to First Token）：首 token 延迟，反映 Prefill 耗时
- **TBT**（Time Between Tokens）：相邻 token 平均间隔，反映 Decode 单步耗时
- **Throughput**（tokens/s）：单位时间生成 token 总数
- **峰值显存（GB）**：推理过程中 GPU 显存最大占用

---

## 3 实验步骤

### Step 1 · 模型选择

按显存选择模型：

| 模型名称 | 官方下载链接 (Hugging Face) | 预估权重显存占用 | 核心特点 |
| :--- | :--- | :--- | :--- |
| **Qwen3-4B-Instruct-FP8** | [Qwen/Qwen3-4B-Instruct-2507-FP8](https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507-FP8) | ~4.5 GB (FP8) | **通用对话量化版**：极低显存开销的通用对话模型，响应迅速，适合轻量级任务和快速部署，非思考模式。 |
| **Qwen3-4B-Instruct** | [Qwen/Qwen3-4B-Instruct-2507](https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507) | ~8.0 GB (BF16/FP16) | **全能长文与平衡**：通用指令微调版，支持超长上下文，综合性能优异，适合日常对话、代码与 RAG，非思考模式。 |


>想要快速上手 Qwen3，建议首先尝试使用 transformers 进行推理（https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507-FP8#quickstart）， 会自动从 Hugging Face 的服务器下载model的权重（model.safetensors），默认地址~/.cache/huggingface/hub/。

>注：如果Hugging Face下载太慢或经常断线，可以去ModelScope把权重文件下载下来，再将分词器和模型权重路径直接换成对应的本地路径。

**可参考官方推理指南**：https://qwen.readthedocs.io/en/latest/getting_started/quickstart.html

---

### Step 2 · 基础推理

调用 `model.generate()` 跑通任意 prompt，截图终端输出与 `nvidia-smi`，作为报告中的提交内容。

> **参数探索**：可以尝试修改 `temperature`、`top_p` 等解码参数，对比不同随机性设定下，模型输出表现的差异。
---

### Step 3 · Prefill / Decode 分段计时

不使用 `generate()`，手动拆分两阶段：

- **Prefill**：单独调用 `model.forward(input_ids)`，记录耗时与 KV Cache 大小，即 TTFT
- **Decode**：循环调用 `model.forward(next_token, past_key_values=kv)`，记录每步耗时，计算 TBT 均值


> 提示：通过开启 use_cache=True，让模型吐出计算过程中产生的所有历史键值对 (outputs.past_key_values)在 prefill 结束后保留供 decode 复用，这正是实际推理框架的核心机制之一。

**注：** 想了解具体模型结构、Embedding、Forward或Generate的可以查看模型代码，下载模型后可以在 Transformers 库的源码中找到。

---

### Step 4 · 参数影响实验

固定其余参数，每次只改变一个变量，填写以下三组表格。

#### A · 输入长度对 Prefill 的影响

如固定 `output_len=128, batch=1`

| 指标 | input=64 | input=256 | input=512 | input=1024 |
|------|:--------:|:---------:|:---------:|:----------:|
| TTFT (ms) | | | | |
| Prefill Throughput (tok/s) | | | | |
| 显存占用 (GB) | | | | |

#### B · 输出长度对 Decode 的影响

如固定 `input_len=128, batch=1`

| 指标 | output=64 | output=256 | output=512 | output=1024 |
|------|:---------:|:----------:|:----------:|:-----------:|
| TBT 均值 (ms) | | | | |
| Decode Throughput (tok/s) | | | | |
| KV Cache 增量 (GB) | | | | |

#### C · Batch Size 的影响

如固定 `input_len=128, output_len=128`（超出显存上限可跳过）

| 指标 | batch=1 | batch=4 | batch=8 | batch=16 |
|------|:-------:|:-------:|:-------:|:--------:|
| TTFT (ms) | | | | |
| Throughput (tok/s) | | | | |
| 内存占用 (GB) | | | | |

---

## 4 交付要求

### 代码

| 文件 | 说明 |
|------|------|
| `infer.py` | 包含 prefill/decode 分离计时逻辑的完整推理脚本 |
| `benchmark.py` | Step 4 三组实验的自动化测量脚本 |
| `requirements.txt` 或 `environment.yml` | 环境依赖 |
| `README.md` | 复现步骤与模型路径配置说明 |

### 实验报告（PDF）

| 章节 | 内容要求 |
|------|----------|
| 1 环境配置 | GPU 型号与显存、CUDA / PyTorch / transformers 版本、模型选择理由 |
| 2 实验数据 | 实验数据表，附prompt推理截图 |
| 3 数据分析 | 简单进行性能测试总结 |

---

## 5 评分标准（满分 100，折合总成绩 10%）
| 维度 | 分值 | 说明 |
|------|:----:|------|
| 代码可复现性 | 25 | 脚本可运行，README 清晰，依赖完整 |
| Prefill / Decode 分离计时测试 | 25 | 两阶段独立测量，方法合理 |
| 三组参数实验数据完整 | 30 | 数据齐全，图表清晰 |
| 实验报告 | 20 | 结合数据，分析总结 |

**提交方式**：代码文件 + PDF 上传至研究生综合服务平台：https://yjs1.ustc.edu.cn/

**提交格式**：`学号_姓名_lab1.zip`

---
