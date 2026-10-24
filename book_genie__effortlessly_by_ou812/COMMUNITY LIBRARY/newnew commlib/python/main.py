mport asyncio
from fastapi import FastAPI, Request
from voice_handler import VoiceHandler
from form_processor import FormProcessor
from nlp_handler import RasaHandler
from fema_integration import FEMAIntegration
from config import ELEVENLABS_API_KEY, FEMA_API_KEY, GOOGLE_CLOUD_PROJECT, TWILIO_SID, TWILIO_AUTH_TOKEN

app = FastAPI()

class DisasterReliefChatbot:
    def __init__(self):
        self.voice_handler = VoiceHandler(
            elevenlabs_api_key=ELEVENLABS_API_KEY,
            twilio_sid=TWILIO_SID,
            twilio_auth_token=TWILIO_AUTH_TOKEN
        )
        self.form_processor = FormProcessor(project_id=GOOGLE_CLOUD_PROJECT)
        self.nlp_handler = RasaHandler()
        self.fema_integration = FEMAIntegration(api_key=FEMA_API_KEY)
    
    async def process_user_input(self, input_type: str, user_input: str | bytes, phone_number: str = None) -> tuple[str, bytes]:
        """
        Process user input (text, audio, or SMS) and return response (text and audio).
        Args:
            input_type: 'text', 'audio', or 'sms'
            user_input: Text string, audio bytes, or SMS message
            phone_number: Optional, for Twilio SMS replies
        Returns:
            Tuple of (text response, audio response as bytes)
        """
        # Convert input to text
        if input_type == "audio":
            user_text = await self.voice_handler.speech_to_text(user_input)
        elif input_type == "sms":
            user_text = user_input
        else:
            user_text = user_input

        # Parse intent with Rasa
        intent, entities = await self.nlp_handler.parse_intent(user_text)
        
        # Handle FEMA form workflow
        if intent == "start_form":
            form_id = entities.get("form_id", "FEMA_IA")
            response_text = self.form_processor.start_form(form_id)
        elif intent == "submit_document":
            document_path = entities.get("document_path")
            response_text = await self.form_processor.process_document(document_path)
        elif intent == "check_status":
            application_id = entities.get("application_id")
            response_text = self.fema_integration.check_application_status(application_id)
        else:
            response_text = "Sorry, I didn't understand. Please clarify your request."

        # Send SMS response if input was SMS
        if input_type == "sms" and phone_number:
            await self.voice_handler.send_sms(response_text, phone_number)

        # Convert response to audio
        response_audio = await self.voice_handler.text_to_speech(response_text)
        
        return response_text, response_audio

# FastAPI endpoints for web and Twilio webhooks
@app.post("/webhook/twilio")
async def twilio_webhook(request: Request):
    form_data = await request.form()
    user_input = form_data.get("Body")
    phone_number = form_data.get("From")
    bot = DisasterReliefChatbot()
    response_text, _ = await bot.process_user_input("sms", user_input, phone_number)
    return {"Message": response_text}

@app.post("/process")
async def process_input(input_type: str, user_input: str):
    bot = DisasterReliefChatbot()
    response_text, response_audio = await bot.process_user_input(input_type, user_input)
    with open("output_audio.mp3", "wb") as f:
        f.write(response_audio)
    return {"text": response_text, "audio_file": "output_audio.mp3"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

Enhancements:Added FastAPI for web and Twilio webhook support.
Integrated Twilio SMS handling via /webhook/twilio endpoint.
Supports multiple input types (text, audio, SMS).

2. voice_handler.pyIntegrates ElevenLabs for TTS and Twilio for SMS/call center support.python

import asyncio
from elevenlabs import AsyncElevenLabs, VoiceSettings
from twilio.rest import Client
from config import ELEVENLABS_API_KEY, TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER

class VoiceHandler:
    def __init__(self, elevenlabs_api_key: str, twilio_sid: str, twilio_auth_token: str):
        self.elevenlabs_client = AsyncElevenLabs(api_key=elevenlabs_api_key)
        self.twilio_client = Client(twilio_sid, twilio_auth_token)
    
    async def text_to_speech(self, text: str, voice_id: str = "Rachel") -> bytes:
        """
        Convert text to speech using ElevenLabs.
        """
        try:
            response = await self.elevenlabs_client.text_to_speech.convert(
                voice_id=voice_id,
                text=text,
                voice_settings=VoiceSettings(
                    stability=0.7,
                    similarity_boost=0.7,
                    style=0.2,
                    use_speaker_boost=True
                ),
                output_format="mp3_44100_128"
            )
            audio_bytes = b""
            async for chunk in response:
                audio_bytes += chunk
            return audio_bytes
        except Exception as e:
            print(f"TTS Error: {e}")
            return b""

    async def speech_to_text(self, audio_data: bytes) -> str:
        """
        Convert audio to text using Whisper (placeholder).
        """
        # TODO: Integrate OpenAI Whisper or Google Speech-to-Text
        return "Dummy transcription: Please help with FEMA form"

    async def send_sms(self, message: str, to_phone_number: str):
        """
        Send SMS response using Twilio.
        """
        try:
            self.twilio_client.messages.create(
                body=message,
                from_=TWILIO_PHONE_NUMBER,
                to=to_phone_number
            )
            print(f"SMS sent to {to_phone_number}")
        except Exception as e:
            print(f"SMS Error: {e}")

Enhancements:Added Twilio SMS support using twilio.rest.Client.

Configured for low-latency ElevenLabs TTS with empathetic tone.
Placeholder for STT (ready for Whisper or Google STT integration).

3. form_processor.pyUses Google Cloud Document AI for form processing and FEMA form validation.python

from google.cloud import documentai_v1 as documentai
from typing import Dict, Tuple
from config import GOOGLE_CLOUD_PROJECT

class FormProcessor:
    def __init__(self, project_id: str):
        self.project_id = project_id
        self.forms_db = {
            "FEMA_IA": {
                "name": "Individual Assistance",
                "fields": ["name", "address", "proof_of_loss", "insurance_info"],
                "status": "pending"
            },
            "FEMA_HMA": {
                "name": "Hazard Mitigation Assistance",
                "fields": ["project_plan", "budget", "eligibility"],
                "status": "pending"
            }
        }
        self.client = documentai.DocumentProcessorServiceClient()

    def start_form(self, form_id: str) -> str:
        """
        Start a FEMA form workflow.
        """
        if form_id not in self.forms_db:
            return "Invalid form ID. Available forms: FEMA_IA, FEMA_HMA."
        form = self.forms_db[form_id]
        return f"Starting {form['name']} application. Please provide: {', '.join(form['fields'])}."

    async def process_document(self, document_path: str) -> str:
        """
        Process a FEMA form using Google Cloud Document AI.
        Args:
            document_path: Path to the uploaded document (PDF/image)
        Returns:
            Response text
        """
        try:
            processor_name = f"projects/{self.project_id}/locations/us/processors/your_processor_id"  # Replace with your Document AI processor ID
            with open(document_path, "rb") as file:
                content = file.read()

            document = documentai.Document(
                content=content,
                mime_type="application/pdf"  # Adjust for image if needed
            )
            request = documentai.ProcessRequest(
                name=processor_name,
                raw_document=document
            )
            result = self.client.process_document(request=request)
            extracted_data = self._extract_form_fields(result.document)

            # Validate against FEMA form requirements
            form_id = self._identify_form(extracted_data)
            if form_id not in self.forms_db:
                return "Unable to identify form type."
            required_fields = self.forms_db[form_id]["fields"]
            missing_fields = [field for field in required_fields if field not in extracted_data]
            if missing_fields:
                return f"Missing fields: {', '.join(missing_fields)}"
            return f"Document processed successfully for {self.forms_db[form_id]['name']}."
        except Exception as e:
            return f"Document Processing Error: {e}"

    def _extract_form_fields(self, document: documentai.Document) -> Dict:
        """
        Extract fields from Document AI output.
        """
        extracted_data = {}
        for entity in document.entities:
            extracted_data[entity.type_] = entity.mention_text
        return extracted_data

    def _identify_form(self, extracted_data: Dict) -> str:
        """
        Identify FEMA form type based on extracted data.
        """
        # Mock logic: Identify form by key fields
        if "proof_of_loss" in extracted_data:
            return "FEMA_IA"
        elif "project_plan" in extracted_data:
            return "FEMA_HMA"
        return ""
