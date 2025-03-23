import { useEffect, useState } from "react";
import io from "socket.io-client";

const SERVER_URL = "https://webrtc-server.up.railway.app"; // Replace with Railway backend URL

export default function Home() {
    const [socket, setSocket] = useState(null);
    const [peerConnection, setPeerConnection] = useState(null);
    const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

    useEffect(() => {
        const newSocket = io(SERVER_URL);
        setSocket(newSocket);

        return () => newSocket.disconnect();
    }, []);

    async function startCall() {
        const peer = new RTCPeerConnection(config);
        setPeerConnection(peer);

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => peer.addTrack(track, stream));

        peer.onicecandidate = event => {
            if (event.candidate) socket.emit("ice-candidate", event.candidate);
        };

        peer.ontrack = event => {
            const audio = new Audio();
            audio.srcObject = event.streams[0];
            audio.play();
        };

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit("offer", offer);
    }

    useEffect(() => {
        if (!socket) return;

        socket.on("offer", async offer => {
            const peer = new RTCPeerConnection(config);
            setPeerConnection(peer);

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => peer.addTrack(track, stream));

            await peer.setRemoteDescription(offer);
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socket.emit("answer", answer);

            peer.onicecandidate = event => {
                if (event.candidate) socket.emit("ice-candidate", event.candidate);
            };

            peer.ontrack = event => {
                const audio = new Audio();
                audio.srcObject = event.streams[0];
                audio.play();
            };
        });

        socket.on("answer", answer => {
            peerConnection?.setRemoteDescription(answer);
        });

        socket.on("ice-candidate", candidate => {
            peerConnection?.addIceCandidate(candidate);
        });
    }, [socket, peerConnection]);

    function endCall() {
        peerConnection?.close();
    }

    return (
        <div style={{ textAlign: "center", padding: "20px" }}>
            <h1>Two-Person Audio Chat</h1>
            <button onClick={startCall}>Start Call</button>
            <button onClick={endCall}>End Call</button>
        </div>
    );
}
