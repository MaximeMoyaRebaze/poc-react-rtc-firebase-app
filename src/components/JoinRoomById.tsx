import React, { useEffect } from 'react';
import firebase from 'firebase/app';
import 'firebase/firestore';

const JoinRoom: React.FC = () => {
    useEffect(() => {
        const joinRoomById = async (roomId: string) => {
            const db = firebase.firestore();
            const roomRef = db.collection('rooms').doc(roomId);
            const roomSnapshot = await roomRef.get();
            console.log('Got room:', roomSnapshot.exists);

            if (roomSnapshot.exists) {
                console.log('Create PeerConnection with configuration:', configuration);
                const peerConnection = new RTCPeerConnection(configuration);
                // Register peer connection listeners here
                registerPeerConnectionListeners(peerConnection);

                localStream.getTracks().forEach(track => {
                    peerConnection.addTrack(track, localStream);
                });

                // Code for collecting ICE candidates below
                const calleeCandidatesCollection = roomRef.collection('calleeCandidates');
                peerConnection.addEventListener('icecandidate', event => {
                    if (!event.candidate) {
                        console.log('Got final candidate!');
                        return;
                    }
                    console.log('Got candidate:', event.candidate);
                    calleeCandidatesCollection.add(event.candidate.toJSON());
                });
                // Code for collecting ICE candidates above

                peerConnection.addEventListener('track', event => {
                    console.log('Got remote track:', event.streams[0]);
                    event.streams[0].getTracks().forEach(track => {
                        console.log('Add a track to the remoteStream:', track);
                        remoteStream.addTrack(track);
                    });
                });

                // Code for creating SDP answer below
                const offer = roomSnapshot.data()?.offer;
                console.log('Got offer:', offer);
                await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await peerConnection.createAnswer();
                console.log('Created answer:', answer);
                await peerConnection.setLocalDescription(answer);

                const roomWithAnswer = {
                    answer: {
                        type: answer.type,
                        sdp: answer.sdp,
                    },
                };
                await roomRef.update(roomWithAnswer);
                // Code for creating SDP answer above

                // Listening for remote ICE candidates below
                roomRef.collection('callerCandidates').onSnapshot(snapshot => {
                    snapshot.docChanges().forEach(async change => {
                        if (change.type === 'added') {
                            const data = change.doc.data();
                            console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
                            await peerConnection.addIceCandidate(new RTCIceCandidate(data));
                        }
                    });
                });
                // Listening for remote ICE candidates above
            }
        };

        joinRoomById('your-room-id');
    }, []);

    // Replace configuration, localStream, and remoteStream with your own variables

    return (
        <div>
            {/* Render your component content here */}
        </div>
    );
};

export default JoinRoom;