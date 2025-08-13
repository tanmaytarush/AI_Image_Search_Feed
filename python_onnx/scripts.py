#!/usr/bin/env python3
"""
Export diwank/dfe-base-en-1 sentence-transformers model to ONNX format
with proper 1536-dimensional output - FIXED for task argument error
"""

import torch
import torch.nn as nn
from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer
from optimum.onnxruntime import ORTModelForFeatureExtraction
import onnxruntime
import numpy as np
import os

MODEL_ID = "diwank/dfe-base-en-1"
OUTPUT_DIR = "./onnx_1536"

def export_with_optimum():
    """Use Optimum's direct export method with explicit task specification"""
    print(f"Loading and exporting model {MODEL_ID} with Optimum...")
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    try:
        # Export using Optimum with explicit task specification
        model = ORTModelForFeatureExtraction.from_pretrained(
            MODEL_ID,
            export=True,
            task='feature-extraction',  # Explicitly specify the task
            save_directory=OUTPUT_DIR
        )
        
        # Also save the tokenizer
        tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
        tokenizer.save_pretrained(OUTPUT_DIR)
        
        print(f"✅ Model exported to {OUTPUT_DIR}")
        return OUTPUT_DIR
        
    except Exception as e:
        print(f"Optimum export failed: {e}")
        # Fall back to alternative method
        return export_with_cli()

def export_with_cli():
    """Fallback: Use Optimum CLI for export"""
    print("Trying export with Optimum CLI...")
    
    import subprocess
    import sys
    
    try:
        # Use optimum-cli export command
        cmd = [
            sys.executable, "-m", "optimum.exporters.onnx",
            "--model", MODEL_ID,
            "--task", "feature-extraction",
            OUTPUT_DIR
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✅ CLI export successful to {OUTPUT_DIR}")
            return OUTPUT_DIR
        else:
            print(f"CLI export failed: {result.stderr}")
            return export_manual_wrapper()
            
    except Exception as e:
        print(f"CLI method failed: {e}")
        return export_manual_wrapper()

def export_manual_wrapper():
    """Manual wrapper approach with task specification"""
    print("Using manual wrapper approach...")
    
    # Disable MPS if available
    if torch.backends.mps.is_available():
        print("🔧 MPS detected - forcing CPU usage")
    torch.set_default_device('cpu')
    
    class TaskAwareSentenceTransformerWrapper(nn.Module):
        def __init__(self, model_path):
            super().__init__()
            self.model = SentenceTransformer(model_path, device='cpu')
            self.model.eval()
            self.model = self.model.cpu()
            # Set task attribute to help with routing
            self.task = 'feature-extraction'
        
        def forward(self, input_ids, attention_mask):
            input_ids = input_ids.cpu().long()
            attention_mask = attention_mask.cpu().long()
            
            features = {
                'input_ids': input_ids,
                'attention_mask': attention_mask
            }
            
            embeddings = self.model(features)['sentence_embedding']
            return embeddings
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    
    # Create wrapper model
    wrapper_model = TaskAwareSentenceTransformerWrapper(MODEL_ID)
    
    # Create dummy input
    dummy_text = "This is a sample sentence for ONNX export."
    inputs = tokenizer(dummy_text, return_tensors="pt", padding=True, truncation=True)
    
    input_ids = inputs['input_ids'].cpu().long()
    attention_mask = inputs['attention_mask'].cpu().long()
    
    # Export to ONNX
    with torch.no_grad():
        torch.onnx.export(
            wrapper_model,
            (input_ids, attention_mask),
            f"{OUTPUT_DIR}/model.onnx",
            export_params=True,
            opset_version=14,
            do_constant_folding=True,
            input_names=['input_ids', 'attention_mask'],
            output_names=['sentence_embedding'],
            dynamic_axes={
                'input_ids': {0: 'batch_size', 1: 'sequence'},
                'attention_mask': {0: 'batch_size', 1: 'sequence'},
                'sentence_embedding': {0: 'batch_size'}
            },
            verbose=False
        )
    
    # Save tokenizer
    tokenizer.save_pretrained(OUTPUT_DIR)
    
    print(f"✅ Manual export completed to {OUTPUT_DIR}/model.onnx")
    return OUTPUT_DIR

def test_onnx_model(model_path):
    """Test the exported ONNX model"""
    print("Testing ONNX model...")
    
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    session = onnxruntime.InferenceSession(
        f"{model_path}/model.onnx",
        providers=['CPUExecutionProvider']
    )
    
    test_text = "This is a test sentence for embedding."
    inputs = tokenizer(test_text, return_tensors="np", padding=True, truncation=True)
    
    outputs = session.run(
        ['sentence_embedding'],
        {
            'input_ids': inputs['input_ids'].astype(np.int64),
            'attention_mask': inputs['attention_mask'].astype(np.int64)
        }
    )
    
    embedding = outputs[0]
    print(f"✅ ONNX model output shape: {embedding.shape}")
    print(f"✅ Embedding dimension: {embedding.shape[1]}")
    print(f"✅ First 5 values: {embedding[0][:5]}")
    
    return embedding

if __name__ == "__main__":
    try:
        # Try multiple export methods in order of preference
        output_path = export_with_optimum()
        
        # Test the exported model
        test_onnx_model(output_path)
        
        print("\n🎉 Export complete! Files created:")
        print(f"  - {output_path}/model.onnx")
        print(f"  - {output_path}/tokenizer.json")
        print(f"  - {output_path}/config.json")
        
    except Exception as e:
        print(f"❌ All export methods failed: {e}")
