!pip install -q diffusers transformers accelerate torch safetensors
import torch
from diffusers import StableDiffusionPipeline

model_id = "runwayml/stable-diffusion-v1-5"

pipe = StableDiffusionPipeline.from_pretrained(
    model_id,
    torch_dtype=torch.float16
).to("cuda")
prompt = "cappadocia style ceramic plate, traditional turkish patterns, highly detailed, 4k"

image = pipe(prompt).images[0]

image.save("output.png")
image
