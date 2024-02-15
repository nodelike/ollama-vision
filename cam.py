from flask import Flask, Response, render_template, request, jsonify
import ollama
from PIL import Image
import io
from flask_cors import CORS
from queue import Queue
import threading

app = Flask(__name__)
CORS(app)

responses = Queue()

def llava(img, model, prompt):
    
    stream = ollama.generate(model, prompt, images=[img], stream=True)
    for chunk in stream:
        responses.put(chunk['response'])
    responses.put("end-stream")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_models')
def get_models():
    model_data = ollama.list()
    model_names = [model['name'] for model in model_data['models']]
    return jsonify(model_names)

@app.route('/process_image', methods=['POST'])
def process_image():
    if 'image' in request.files:
        image_file = request.files['image']
        pil_img = Image.open(io.BytesIO(image_file.read()))
        img_byte_arr = io.BytesIO()
        pil_img.save(img_byte_arr, format='JPEG')
        img_byte_arr = img_byte_arr.getvalue()
        
        prompt = request.form.get('prompt', 'What is in this image')
        model = request.form.get('model', 'llava')
        
        threading.Thread(target=llava, args=(img_byte_arr, model, prompt)).start()

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
