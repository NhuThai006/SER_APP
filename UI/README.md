# Speech Emotion AI

This is a Next.js application that runs a client-side Speech Emotion Recognition (SER) model using `onnxruntime-web`. The entire processing pipeline (audio decoding, feature extraction, and inference) runs in the browser without sending any audio data to a backend server.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Converting the PyTorch Model to ONNX

To use your `ResLSTM-SA` model in this application, you must convert it from PyTorch `.pt` to `.onnx` and place it in the `public/model/` directory.

### 1. Requirements

Ensure you have `torch` and `onnx` installed in your Python environment.

### 2. Export Script

Use the following Python snippet to export your model. Note that we use `dynamic_axes` so the model can accept variable-length audio features without padding:

```python
import torch
from models.res_lstm import ResLSTM_Multi_Att

# Initialize model architecture and load weights
# Ensure dimensions match your training configuration
model = ResLSTM_Multi_Att(input_size=46, hidden_size=64, num_layers=2, num_att=4, num_classes=8)
model.load_state_dict(torch.load("model.pt", map_location="cpu"))
model.eval()

# Dummy input shape: [batch=1, time_steps=ANY, n_features=46]
TIME_STEPS = 100
N_FEATURES = 46 
dummy_input = torch.randn(1, TIME_STEPS, N_FEATURES)

# Export to ONNX (dynamic_axes allows time_steps to vary)
torch.onnx.export(
    model, 
    dummy_input, 
    "model.onnx",
    input_names=["input"], 
    output_names=["output"],
    dynamic_axes={"input": {1: "time_steps"}}
)
```

### 3. Deployment

Copy the generated `model.onnx` file to the `UI/public/model/` directory of this project:

```bash
cp model.onnx path/to/SER_app/UI/public/model/model.onnx
```

Once placed, the web app will automatically load and use it for inference.
