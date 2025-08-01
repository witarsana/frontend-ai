import os
from openai import OpenAI
import requests
from typing import Dict, List, Any, Optional

# Optional ollama import
try:
    import ollama
    OLLAMA_AVAILABLE = True
except ImportError:
    print("⚠️  Ollama not available - local AI features will be limited")
    OLLAMA_AVAILABLE = False

def mask_api_key(key):
    """Utility to mask API keys for logging (showing first 4 and last 4 characters)"""
    if key and len(key) > 8:
        return f"{key[:4]}...{key[-4:]}"
    return key

def initialize_providers(config=None):
    """Initialize all API providers and return their readiness status and clients"""
    
    # Get API tokens from environment
    openrouter_token = os.getenv("OPENROUTER_API_KEY")
    deepseek_token = os.getenv("DEEPSEEK_API_KEY") 
    mistral_token = os.getenv("MISTRAL_API_KEY")
    huggingface_token = os.getenv("HUGGINGFACE_TOKEN")
    
    # Get model configurations (with defaults)
    model_openrouter = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.1-8b-instruct:free")
    model_deepseek = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    model_huggingface = os.getenv("HUGGINGFACE_MODEL", "meta-llama/Meta-Llama-3.1-8B-Instruct")
    model_mistral = os.getenv("MISTRAL_MODEL", "mistral-tiny")
    
    # Initialize clients
    client_openrouter = None
    client_deepseek = None
    client_mistral = None
    
    # Check provider readiness
    openrouter_ready = bool(openrouter_token)
    deepseek_ready = bool(deepseek_token)
    mistral_ready = bool(mistral_token)
    huggingface_ready = bool(huggingface_token)
    
    # Initialize OpenRouter client
    if openrouter_ready:
        try:
            client_openrouter = OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=openrouter_token,
            )
            print(f"✅ OpenRouter initialized with model: {model_openrouter}")
        except Exception as e:
            print(f"❌ OpenRouter initialization failed: {e}")
            openrouter_ready = False
    
    # Initialize DeepSeek client
    if deepseek_ready:
        try:
            client_deepseek = OpenAI(
                base_url="https://api.deepseek.com/v1",
                api_key=deepseek_token,
            )
            print(f"✅ DeepSeek initialized with model: {model_deepseek}")
        except Exception as e:
            print(f"❌ DeepSeek initialization failed: {e}")
            deepseek_ready = False
    
    # Initialize Mistral client
    if mistral_ready:
        try:
            from mistralai.client import MistralClient
            client_mistral = MistralClient(api_key=mistral_token)
            print(f"✅ Mistral initialized with model: {model_mistral}")
        except ImportError:
            try:
                from mistralai import Mistral as MistralClient
                client_mistral = MistralClient(api_key=mistral_token)
                print(f"✅ Mistral (legacy) initialized with model: {model_mistral}")
            except Exception as e:
                print(f"❌ Mistral initialization failed: {e}")
                mistral_ready = False
        except Exception as e:
            print(f"❌ Mistral initialization failed: {e}")
            mistral_ready = False
    
    return {
        'clients': {
            'openrouter': client_openrouter,
            'deepseek': client_deepseek,
            'mistral': client_mistral
        },
        'ready': {
            'openrouter': openrouter_ready,
            'deepseek': deepseek_ready,
            'mistral': mistral_ready,
            'huggingface': huggingface_ready
        },
        'tokens': {
            'openrouter': openrouter_token,
            'deepseek': deepseek_token,
            'mistral': mistral_token,
            'huggingface': huggingface_token
        },
        'models': {
            'openrouter': model_openrouter,
            'deepseek': model_deepseek,
            'mistral': model_mistral,
            'huggingface': model_huggingface
        }
    }

def call_api(
    prompt, image_contents=None,
    providers=None,
    ollama_only=False, ollama_model_text="gemma2:2b",
    max_tokens=10000,
    huggingface_url="https://router.huggingface.co/nebius/v1/chat/completions"
):
    """
    Call API providers in priority order: Mistral -> DeepSeek -> OpenRouter -> Hugging Face
    """
    
    if providers is None:
        providers = initialize_providers()
    
    # Extract provider data
    clients = providers['clients']
    ready = providers['ready']
    tokens = providers['tokens']
    models = providers['models']
    
    if ollama_only:
        if not OLLAMA_AVAILABLE:
            raise Exception("Ollama is not installed. Install it with: pip install ollama")
        
        print(f"Current System: Ollama (Local) | Model: {ollama_model_text} | API Key: None (Local)")
        try:
            response = ollama.chat(
                model=ollama_model_text,
                messages=[{"role": "user", "content": prompt}]
            )
            print(f"Response received from Ollama (Model: {ollama_model_text})")
            return response['message']['content'].strip()
        except Exception as e:
            raise Exception(f"Ollama text processing failed: {str(e)}. Ensure 'ollama serve' is running and model '{ollama_model_text}' is pulled (run 'ollama pull {ollama_model_text}').")

    # Try Mistral first
    if ready['mistral']:
        masked_key = mask_api_key(tokens['mistral'])
        print(f"Current System: Mistral | Model: {models['mistral']} | API Key: {masked_key}")
        try:
            messages = [{"role": "user", "content": prompt}]
            if image_contents:
                messages[0]["content"] = [
                    {"type": "text", "text": prompt},
                    *image_contents
                ]
            
            # Try new API format first
            try:
                response = clients['mistral'].chat.completions.create(
                    model=models['mistral'],
                    messages=messages,
                    max_tokens=max_tokens
                )
                content = response.choices[0].message.content.strip()
            except AttributeError:
                # Fallback to older API format
                response = clients['mistral'].chat.complete(
                    model=models['mistral'],
                    messages=messages,
                    max_tokens=max_tokens
                )
                content = response.choices[0].message.content.strip()
            
            print(f"Response received from Mistral (Model: {models['mistral']})")
            return content
        except Exception as e:
            print(f"Mistral API call failed: {str(e)}. Trying DeepSeek...")

    # Try DeepSeek
    if ready['deepseek']:
        masked_key = mask_api_key(tokens['deepseek'])
        print(f"Current System: DeepSeek | Model: {models['deepseek']} | API Key: {masked_key}")
        try:
            messages = [{"role": "user", "content": prompt}]
            if image_contents:
                messages[0]["content"] = [
                    {"type": "text", "text": prompt},
                    *image_contents
                ]
            response = clients['deepseek'].chat.completions.create(
                model=models['deepseek'],
                messages=messages,
                max_tokens=max_tokens
            )
            print(f"Response received from DeepSeek (Model: {models['deepseek']})")
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"DeepSeek API call failed: {str(e)}. Trying OpenRouter...")

    # Fallback to OpenRouter
    if ready['openrouter']:
        masked_key = mask_api_key(tokens['openrouter'])
        print(f"Current System: OpenRouter | Model: {models['openrouter']} | API Key: {masked_key}")
        try:
            messages = [{"role": "user", "content": prompt}]
            if image_contents:
                messages[0]["content"] = [
                    {"type": "text", "text": prompt},
                    *image_contents
                ]
            response = clients['openrouter'].chat.completions.create(
                model=models['openrouter'],
                messages=messages,
                max_tokens=max_tokens
            )
            print(f"Response received from OpenRouter (Model: {models['openrouter']})")
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"OpenRouter API call failed: {str(e)}. Trying Hugging Face...")

    # Fallback to Hugging Face
    if ready['huggingface']:
        masked_key = mask_api_key(tokens['huggingface'])
        print(f"Current System: Hugging Face | Model: {models['huggingface']} | API Key: {masked_key}")
        headers = {
            "Authorization": f"Bearer {tokens['huggingface']}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": models['huggingface'],
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens
        }
        if image_contents:
            payload["messages"][0]["content"] = [
                {"type": "text", "text": prompt},
                *image_contents
            ]
        try:
            response = requests.post(
                huggingface_url,
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            print(f"Response received from Hugging Face (Model: {models['huggingface']})")
            return response.json()["choices"][0]["message"]["content"].strip()
        except requests.exceptions.HTTPError as e:
            if "402" in str(e):
                print(f"Hugging Face credit limit exceeded: {str(e)}. Please upgrade your plan or wait for credits to reset.")
            else:
                print(f"Hugging Face API call failed: {str(e)}.")
        except Exception as e:
            print(f"Hugging Face API call failed: {str(e)}.")

    raise Exception("All API providers failed. Check tokens in .env (MISTRAL_API_KEY, DEEPSEEK_API_KEY, OPENROUTER_API_KEY, HUGGINGFACE_TOKEN) or network.")
