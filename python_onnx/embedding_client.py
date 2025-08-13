#!/usr/bin/env python3
"""
Create a custom 1536-dimensional sentence transformer and check its dimensions
"""

# Optimum CLI

import torch
import torch.nn as nn
from sentence_transformers import SentenceTransformer, models
from transformers import AutoTokenizer, AutoModel

def create_custom_1536_model():
    # Use a base model and add a projection layer
    base_model_name = "sentence-transformers/all-MiniLM-L6-v2"
    
    # Load components
    word_embedding_model = models.Transformer(base_model_name)
    pooling_model = models.Pooling(word_embedding_model.get_word_embedding_dimension())
    
    # Add dense layer to project to 1536 dimensions
    dense_model = models.Dense(
        in_features=pooling_model.get_sentence_embedding_dimension(),
        out_features=1536,
        activation_function=nn.Tanh()
    )
    
    # Create the model
    model = SentenceTransformer(modules=[word_embedding_model, pooling_model, dense_model])
    
    return model

def check_model_dimensions():
    """Check the dimensions of the custom model"""
    print("Creating custom 1536-dimensional model...")
    model = create_custom_1536_model()
    
    # Test with sample sentences
    test_sentences = [
        "This is a test sentence.",
        "Another test sentence for verification.",
        "Living room furniture and decor"
    ]
    
    print("Encoding test sentences...")
    embeddings = model.encode(test_sentences)
    
    print(f"✅ Model created successfully!")
    print(f"✅ Number of test sentences: {len(test_sentences)}")
    print(f"✅ Embeddings shape: {embeddings.shape}")
    print(f"✅ Embedding dimension per sentence: {embeddings.shape[1]}")
    print(f"✅ Data type: {embeddings.dtype}")
    
    # Check individual components
    print("\n📋 Model Architecture:")
    for i, module in enumerate(model):
        print(f"  {i}: {type(module).__name__}")
        if hasattr(module, 'get_sentence_embedding_dimension'):
            print(f"     Output dimension: {module.get_sentence_embedding_dimension()}")
    
    # Verify the final dimension is 1536
    assert embeddings.shape[1] == 1536, f"Expected 1536 dimensions, got {embeddings.shape[1]}"
    print("\n🎉 Model successfully outputs 1536-dimensional embeddings!")
    
    return model, embeddings

if __name__ == "__main__":
    try:
        model, embeddings = check_model_dimensions()
        
        # Show first few values of first embedding
        print(f"\n📊 First embedding (first 10 values): {embeddings[0][:10]}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
