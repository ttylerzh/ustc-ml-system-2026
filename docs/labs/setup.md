# Environment Setup

## Prerequisites

- Linux (Ubuntu 22.04 recommended)
- CUDA Toolkit 12.0+
- Python 3.10+
- PyTorch 2.0+

## Installation

```bash
# Install CUDA
sudo apt install nvidia-cuda-toolkit

# Create Conda environment
conda create -n ml-system python=3.10
conda activate ml-system
pip install torch torchvision torchaudio
```

## Verify Installation

```python
import torch
print(torch.cuda.is_available())
```
