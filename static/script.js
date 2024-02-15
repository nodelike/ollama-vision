let liveThink = false;

document.addEventListener('DOMContentLoaded', (event) => {
    startCamera();

    const liveThinkBtn = document.getElementById('live-think')
    const captureThinkBtn = document.getElementById('capture-think')

    liveThinkBtn.addEventListener('click', function() {
        liveThink = !liveThink;
        if(liveThink){
            liveThinkBtn.style.background = '#50C878'
            captureThinkBtn.disabled = true;
            captureImage();
        } else {
            liveThinkBtn.style.background = ''
            liveThinkBtn.style.color = ''
            captureThinkBtn.disabled = false;
        }
        
    });

    captureThinkBtn.addEventListener('click', function() {
        captureImage();
    });
});

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

    document.getElementById("response").textContent = 'Thinking...';
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
        const formData = new FormData();
        formData.append('image', blob);

        
        fetch('/process_image', { method: 'POST', body: formData })
        .then(() => {
            const source = new EventSource('/stream_response');

            source.onmessage = function(event) {
                const responseDiv = document.getElementById('response');
                if (responseDiv.textContent === 'Thinking...') {
                    responseDiv.textContent = '';
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
