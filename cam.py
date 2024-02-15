from flask import Flask, Response, render_template, request, jsonify
import ollama
from PIL import Image
import io
from typing import Generator
from flask_cors import CORS
from queue import Queue
import threading

app = Flask(__name__)
CORS(app)

systemPrompt = 'what is in this image?'

responses = Queue()

def llava(img):
    stream = ollama.generate('vision', systemPrompt, images=[img], stream=True)
    for chunk in stream:
        responses.put(chunk['response'])
    responses.put("end-stream")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/process_image', methods=['POST'])
def process_image():
    if 'image' in request.files:
        image_file = request.files['image']
        pil_img = Image.open(io.BytesIO(image_file.read()))
        img_byte_arr = io.BytesIO()
        pil_img.save(img_byte_arr, format='JPEG')
        img_byte_arr = img_byte_arr.getvalue()
        
        threading.Thread(target=llava, args=(img_byte_arr,)).start()

        return jsonify({'message': 'Image processing started'}), 200

    return jsonify({'error': 'No image provided'}), 400

@app.route('/stream_response')
def stream_response():
    def generate():
        while True:
            if not responses.empty():
                yield f"data: {responses.get()}\n\n"

    return Response(generate(), mimetype='text/event-stream')

if __name__ == '__main__':
    app.run(debug=True)
