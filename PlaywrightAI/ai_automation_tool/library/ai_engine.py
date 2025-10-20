# library/ai_engine.py
import requests
import json
import re
from library.config_manager import ConfigManager

class AIEngine:
    def __init__(self):
        self.config = ConfigManager()
        self.api_key = self.config.get_required("MISTRAL_API_KEY")
        self.api_base = self.config.get("MISTRAL_API_BASE", "https://api.mistral.ai/v1")
        self.model = self.config.get("MISTRAL_MODEL", "mistral-large-latest")  # Gunakan model terbaik untuk perencanaan

    def _call_mistral_api(self, messages, temperature=0.1, is_json=True):
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 4096
        }
        if is_json:
            payload["response_format"] = {"type": "json_object"}
        try:
            response = requests.post(f"{self.api_base}/chat/completions", headers=headers, data=json.dumps(payload))
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            if is_json:
                # Bersihkan jika ada blok markdown
                json_match = re.search(r"```json\n([\s\S]*?)\n```", content, re.DOTALL)
                if json_match:
                    content = json_match.group(1).strip()
                return json.loads(content)
            return content
        except Exception as e:
            print(f"Error calling Mistral API or decoding JSON: {e}")
            return None

    # AI #1: Planner (Perencana Strategis)
    def create_structured_plan(self, goal, url):
        prompt = f"""
You are an expert test automation strategist. Your task is to break down a complex user goal into a simple, logical sequence of actions.

**User Goal:** "{goal}"
**Starting URL:** "{url}"

**Instructions:**
1.  Analyze the user's entire goal.
2.  Deconstruct it into a step-by-step plan. Each step should be a simple, high-level action.
3.  The allowed actions are `TYPE`, `CLICK`, and `VALIDATE`.
4.  For `TYPE` actions, specify the value to be typed.
5.  For `VALIDATE` actions, specify what text or state to verify.
6.  The output MUST be a JSON object with a single key "plan", containing a list of these action objects.

**Example:**
For a goal "login with user test@test.com pass 123, then search for 'My Plot'", the output should be:
{{
  "plan": [
    {{ "action": "CLICK", "description": "the 'Login' button on the main page" }},
    {{ "action": "TYPE", "description": "the email input field", "value": "test@test.com" }},
    {{ "action": "TYPE", "description": "the password input field", "value": "123" }},
    {{ "action": "CLICK", "description": "the final 'Login' button on the form" }},
    {{ "action": "TYPE", "description": "the main plot search input", "value": "My Plot" }},
    {{ "action": "CLICK", "description": "the button to initiate the plot search" }}
  ]
}}

Now, create the strategic plan for the user's goal.
"""
        messages = [{"role": "user", "content": prompt}]
        return self._call_mistral_api(messages)

    # AI #2: Matcher (Pencocok Elemen)
    def find_best_element_for_task(self, task_description, element_list):
        prompt = f"""
You are an AI assistant that matches a task description to the best element from a list.

**Task to Perform:** "{task_description}"

**List of Elements Available on the Page:**
```json
{json.dumps(element_list, indent=2)}
```

Instructions:
- Only select elements that are visible and clickable.
- Prefer input fields with placeholder or aria-label containing 'search' for search tasks.
- For clicking search results, prefer elements whose description or attributes contain the search keyword.
- If no element matches the task, return {{ "best_element_index": null }}.

Your only job is to find the single best element from the list that matches the task description.
Return a JSON object containing the index of the best element.

Example Output:
{{ "best_element_index": 3 }}
"""
        messages = [{"role": "user", "content": prompt}]
        return self._call_mistral_api(messages)

    def generate_playwright_script(self, user_request, start_url):
        prompt = f"""
You are an expert Python Playwright automation engineer.
Generate a complete async Python script using Playwright that fulfills the following user request:

User Request: "{user_request}"
Start URL: "{start_url}"

- Use async/await style.
- Include all necessary imports and the main function.
- Add comments for each step.
- Do not include explanations, only output the code.

Example output:
```python
# ...script here...
```
"""
        messages = [{"role": "user", "content": prompt}]
        script = self._call_mistral_api(messages, is_json=False)
        # Optional: extract code block if needed
        match = re.search(r"```python\n([\s\S]+?)```", script)
        return match.group(1).strip() if match else script.strip()