document.addEventListener('DOMContentLoaded', (event) => {
    startCamera();
});

function startCamera() {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            const video = document.querySelector('video');
            video.srcObject = stream;
            video.play(); // Play the video stream
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
            // Connect to the EventSource here
            const source = new EventSource('/stream_response');

            source.onmessage = function(event) {
                const responseDiv = document.getElementById('response');
                if (responseDiv.textContent === 'Thinking...') {
                    responseDiv.textContent = '';
                }
                if (event.data === "end-stream") {
                    console.log("Finished!")
                    source.close();
                    // captureImage();
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
