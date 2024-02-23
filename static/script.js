let liveThink = false;

document.addEventListener('DOMContentLoaded', (event) => {
    startCamera();
    updateModelDropdown();

    const liveThinkBtn = document.getElementById('live-think')
    const captureThinkBtn = document.getElementById('capture-think')

    liveThinkBtn.addEventListener('click', function() {
        liveThink = !liveThink;
        if(liveThink){
            liveThinkBtn.style.background = '#50C878'
            liveThinkBtn.classList.add("active")
            document.getElementById("model").disabled = true;
            document.getElementById("prompt").disabled = true;
            captureThinkBtn.disabled = true;
            captureImage();
        } else {
            liveThinkBtn.style.background = ''
            liveThinkBtn.style.color = ''
            liveThinkBtn.classList.remove("active")
            document.getElementById("model").disabled = false;
            document.getElementById("prompt").disabled = false;
            captureThinkBtn.disabled = false;
        }
        
    });

    captureThinkBtn.addEventListener('mousedown', function() {
        captureImage();
        captureThinkBtn.classList.add("active")
    });

    captureThinkBtn.addEventListener('mouseup', function() {
        captureThinkBtn.classList.remove("active")
    });
});

function updateModelDropdown() {
    fetch('/get_models')
        .then(response => response.json())
        .then(models => {
            const modelSelect = document.getElementById('model');
            models.forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                modelSelect.appendChild(option);
            });
        })
        .catch(console.error);
}

function startCamera() {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            const video = document.querySelector('video');
            video.srcObject = stream;
            video.play();
        })
        .catch(console.error);
}


function captureImage() {
    const video = document.querySelector('video');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    document.getElementById("response").textContent = '>>> Thinking...';
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    const dataURL = canvas.toDataURL('image/jpeg');

    const img = document.getElementById('captured-image');
    img.src = dataURL;

    canvas.toBlob(blob => {
        const formData = new FormData();
        formData.append('image', blob);

        const prompt = document.getElementById('prompt').value;
        formData.append('prompt', prompt);

        const model = document.getElementById('model').value;
        formData.append('model', model);
        
        fetch('/process_image', { method: 'POST', body: formData })
        .then(() => {
            const source = new EventSource('/stream_response');

            source.onmessage = function(event) {
                const responseDiv = document.getElementById('response');
                if (responseDiv.textContent === '>>> Thinking...') {
                    responseDiv.textContent = '>>> ';
                }
                if (event.data === "end-stream") {
                    console.log("Finished!")
                    source.close();
                    if (liveThink){
                        setTimeout(captureImage, 3000);
                    }
                } else {
                    responseDiv.textContent += event.data;
                }
            };

            source.onerror = function() {
                console.error("EventSource failed.");
                source.close();
            };
        });
    }, 'image/jpeg');
}
