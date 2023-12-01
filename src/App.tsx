import { useEffect, useRef, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { addDoc, collection, doc, getDoc, getFirestore, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import './App.css'
import DialogBox from './components/DialogBox';

function App() {

  // FIREBASE CONFIG :
  const firebaseConfig = {
    apiKey: "AIzaSyABo_Nw1vxbUBx7CN6M739FExqOu8wlkSA",
    authDomain: "poc-web-rtc-1403a.firebaseapp.com",
    projectId: "poc-web-rtc-1403a",
    storageBucket: "poc-web-rtc-1403a.appspot.com",
    messagingSenderId: "761191572427",
    appId: "1:761191572427:web:684fd98a2d1193eae10c4e",
    measurementId: "G-V3B6VDE0JL"
  };
  const appFirebase = initializeApp(firebaseConfig);
  const db = getFirestore(appFirebase);
  const dbRoom = collection(db, 'rooms')
  const roomRef = doc(dbRoom);
  const callerCandidatesCollection = collection(roomRef, 'callerCandidates')

  // TURN ICE SERVER CONFIG :
  const configuration = {
    iceServers: [
      {
        urls: [
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302',
        ],
      },
    ],
    iceCandidatePoolSize: 10,
  };

  // VARIABLES :
  RTCIceCandidate
  // let peerConnection: RTCPeerConnection;
  // let remoteStream: MediaStream;
  let roomId: string;

  const [textRoomId, setTextRoomId] = useState('')
  const [isJoining, setIsJoining] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | undefined>(undefined)
  const [localStream, setLocalStream] = useState<MediaStream | undefined>(undefined)
  const myLocalVideoRef = useRef<HTMLVideoElement | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | undefined>(undefined)
  const myRemoteVideoRef = useRef<HTMLVideoElement | null>(null)

  // INITIALISE LOCAL VIDEO :
  useEffect(() => {
    if (myLocalVideoRef.current && localStream) {
      console.log("myLocalVideoRef.current.srcObject = ", localStream);
      myLocalVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // ROOM CREATION :
  useEffect(() => {
    if (myLocalVideoRef.current && localStream && peerConnection) {
      console.log('CREATE ROOM => localStream : ', localStream);

      localStream.getTracks().forEach(track => {
        console.log('SEND LOCALSTREAM TO CONNECTION : ', track);
        peerConnection.addTrack(track, localStream);
      });



      peerConnection.addEventListener('icecandidate', async event => {
        if (!event.candidate) {
          console.log('Got final candidate!');
          return;
        }
        console.log('Got candidate: ', event.candidate);
        // callerCandidatesCollection.add(event.candidate.toJSON());
        await addDoc(callerCandidatesCollection, event.candidate.toJSON())

      });

    }
  }, [localStream, peerConnection])

  useEffect(() => {
    if (peerConnection && peerConnection.localDescription) {
      console.log("PEER_CONNECTION_LOCAL_STATUS", peerConnection.localDescription);
      console.log("PEER_CONNECTION_REMOTE_STATUS", peerConnection.remoteDescription);
      peerConnection.addEventListener('icecandidate', async event => {
        if (!event.candidate) {
          console.log('Got final candidate!');
          return;
        }
        console.log('Got candidate: ', event.candidate);
        // callerCandidatesCollection.add(event.candidate.toJSON());
        await addDoc(callerCandidatesCollection, event.candidate.toJSON())

      });
    }

  }, [peerConnection?.localDescription])


  // useEffect(() => {
  //   console.log("CONNECTION STATE : ", peerConnection?.connectionState);
  //   if (peerConnection !== null) {
  //     peerConnection?.onicecandidate((peerConnection, event) => { })
  //   }
  // }, [peerConnection?.connectionState])


  useEffect(() => {
    if (myRemoteVideoRef.current && remoteStream) {
      console.log("myRemoteVideoRef.current.srcObject = ", remoteStream);
      myRemoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (peerConnection && remoteStream) {
      peerConnection.addEventListener('track', event => {
        console.log('Got remote track:', event.streams[0]);
        event.streams[0].getTracks().forEach(track => {
          console.log('Add a track to the remoteStream:', track);
          remoteStream.addTrack(track);
        });
      });
    }
  }, [remoteStream, peerConnection])


  // INITIALISE EVENT LISTENER :
  useEffect(() => {
    const hangupBtn = document.querySelector('#hangupBtn');
    const createBtn = document.querySelector('#createBtn');
    const joinBtn = document.querySelector('#joinBtn');
    // const roomDialog = new MDCDialog(document.querySelector('#room-dialog'));

    if (createBtn) {
      createBtn.addEventListener('click', createRoom);
    }
    if (joinBtn) {
      joinBtn.addEventListener('click', joinRoom);
    }
    if (hangupBtn) {
      // hangupBtn.addEventListener('click', hangUp);
    }

    // PEER CONNECTION LOGS :
    if (peerConnection) {
      peerConnection.addEventListener('icegatheringstatechange', () => {
        console.log(
          `ICE gathering state changed: ${peerConnection.iceGatheringState}`);
      });

      peerConnection.addEventListener('connectionstatechange', () => {
        console.log(`Connection state change: ${peerConnection.connectionState}`);
      });

      peerConnection.addEventListener('signalingstatechange', () => {
        console.log(`Signaling state change: ${peerConnection.signalingState}`);
      });

      peerConnection.addEventListener('iceconnectionstatechange ', () => {
        console.log(
          `ICE connection state change: ${peerConnection.iceConnectionState}`);
      });
    }


    return () => {
      if (createBtn) {
        createBtn.removeEventListener('click', createRoom);
      }
      if (joinBtn) {
        joinBtn.removeEventListener('click', joinRoom);
      }
      if (hangupBtn) {
        // hangupBtn.removeEventListener('click', hangUp);
      }
      if (peerConnection) {
        peerConnection.removeEventListener('icegatheringstatechange', () => {
          console.log(
            `ICE gathering state changed: ${peerConnection.iceGatheringState}`);
        });

        peerConnection.removeEventListener('connectionstatechange', () => {
          console.log(`Connection state change: ${peerConnection.connectionState}`);
        });

        peerConnection.removeEventListener('signalingstatechange', () => {
          console.log(`Signaling state change: ${peerConnection.signalingState}`);
        });

        peerConnection.removeEventListener('iceconnectionstatechange ', () => {
          console.log(
            `ICE connection state change: ${peerConnection.iceConnectionState}`);
        });
      }
    };
  }, []);

  async function openUserMedia() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      console.log('STREAM : ', stream);
      // (document.querySelector('#localVideo') as HTMLVideoElement).srcObject = stream;
      setLocalStream(stream);

      // remoteStream = new MediaStream();
      setRemoteStream(new MediaStream());
      // (document.querySelector('#remoteVideo') as HTMLVideoElement).srcObject = remoteStream;

      (document.querySelector('#cameraBtn') as HTMLButtonElement).disabled = true;
      (document.querySelector('#joinBtn') as HTMLButtonElement).disabled = false;
      (document.querySelector('#createBtn') as HTMLButtonElement).disabled = false;
      (document.querySelector('#hangupBtn') as HTMLButtonElement).disabled = false;
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  }

  async function createRoom() {
    const createBtn = document.querySelector('#createBtn') as HTMLButtonElement;
    const joinBtn = document.querySelector('#joinBtn') as HTMLButtonElement;
    createBtn.disabled = true;
    joinBtn.disabled = true;

    // const roomRef = await db.collection('rooms').doc();
    // const dbRoom = collection(db, 'rooms')
    // const roomRef = doc(dbRoom);

    console.log('Create PeerConnection with configuration: ', configuration);
    const peerConnection = new RTCPeerConnection(configuration);

    // const callerCandidatesCollection = roomRef.collection('callerCandidates');
    // const callerCandidatesCollection = collection(roomRef, 'callerCandidates')

    // peerConnection.addEventListener('icecandidate', async event => {
    //   if (!event.candidate) {
    //     console.log('Got final candidate!');
    //     return;
    //   }
    //   console.log('Got candidate: ', event.candidate);
    //   // callerCandidatesCollection.add(event.candidate.toJSON());
    //   await addDoc(callerCandidatesCollection, event.candidate.toJSON())

    // });

    setPeerConnection(peerConnection);

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    console.log('Created offer:', offer);

    const roomWithOffer = {
      offer: {
        type: offer.type,
        sdp: offer.sdp,
      },
    };

    console.log('roomWithOffer', roomWithOffer);

    // const response = await roomRef.set(roomWithOffer);
    const response = await setDoc(roomRef, roomWithOffer);
    console.log('response', response);

    roomId = roomRef.id;
    console.log(`New room created with SDP offer. Room ID: ${roomId}`);

    // document.querySelector('#currentRoom')!.innerText = `Current room is ${roomId} - You are the caller!`;
    setTextRoomId(`Current room is ${roomId} - You are the caller!`)

    // peerConnection.addEventListener('track', event => {
    //   console.log('Got remote track:', event.streams[0]);
    //   event.streams[0].getTracks().forEach(track => {
    //     console.log('Add a track to the remoteStream:', track);
    //     remoteStream.addTrack(track);
    //   });
    // });

    // roomRef.onSnapshot(async snapshot => {
    //   const data = snapshot.data();
    //   if (!peerConnection.currentRemoteDescription && data && data.answer) {
    //     console.log('Got remote description: ', data.answer);
    //     const rtcSessionDescription = new RTCSessionDescription(data.answer);
    //     await peerConnection.setRemoteDescription(rtcSessionDescription);
    //   }
    // });
    onSnapshot(roomRef, async snapshot => {
      const data = snapshot.data();
      if (!peerConnection.currentRemoteDescription && data && data.answer) {
        console.log('Got remote description: ', data.answer);
        const rtcSessionDescription = new RTCSessionDescription(data.answer);
        await peerConnection.setRemoteDescription(rtcSessionDescription);
      }
    })

    // roomRef.collection('calleeCandidates').onSnapshot(snapshot => {
    //   snapshot.docChanges().forEach(async change => {
    //     if (change.type === 'added') {
    //       const data = change.doc.data();
    //       console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
    //       await peerConnection.addIceCandidate(new RTCIceCandidate(data));
    //     }
    //   });
    // });
    const roomCollection = collection(roomRef, 'calleeCandidates')
    onSnapshot(roomCollection, snapshot => {
      snapshot.docChanges().forEach(async change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
          await peerConnection.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    })

  }

  async function joinRoom() {
    setIsJoining(true);
    console.log('Join room:', roomId);
    handleOpenDialog()
    setIsJoining(false);
  }

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleConfirmDialog = async (roomId: string) => {
    setDialogOpen(false);
    setIsJoining(true);
    console.log('Join room:', roomId);
    await joinRoomById(roomId);
    setIsJoining(false);
  };

  async function joinRoomById(roomId: string) {

    // const roomRef = db.collection('rooms').doc(roomId);
    const roomRef = doc(collection(db, 'rooms'), roomId);
    // const roomSnapshot = await roomRef.get();
    const roomSnapshot = await getDoc(roomRef);
    console.log('Got room:', roomSnapshot.exists());

    if (roomSnapshot.exists()) {
      console.log('Create PeerConnection with configuration:', configuration);
      const peerConnection = new RTCPeerConnection(configuration);

      // Register peer connection listeners here
      // registerPeerConnectionListeners(peerConnection);

      localStream.getTracks().forEach(track => {
        console.log("LOCALTRACK: ", track);
        peerConnection.addTrack(track, localStream);
      });

      // Code for collecting ICE candidates below
      // const calleeCandidatesCollection = roomRef.collection('calleeCandidates');
      const calleeCandidatesCollection = collection(roomRef, 'calleeCandidates')
      peerConnection.addEventListener('icecandidate', event => {
        if (!event.candidate) {
          console.log('Got final candidate!');
          return;
        }
        console.log('Got candidate:', event.candidate);
        // calleeCandidatesCollection.add(event.candidate.toJSON());
        addDoc(calleeCandidatesCollection, event.candidate.toJSON())
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
      // await roomRef.update(roomWithAnswer);
      await updateDoc(roomRef, roomWithAnswer);
      // Code for creating SDP answer above

      // Listening for remote ICE candidates below
      // roomRef.collection('callerCandidates').onSnapshot(snapshot => {
      //   snapshot.docChanges().forEach(async change => {
      //     if (change.type === 'added') {
      //       const data = change.doc.data();
      //       console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
      //       await peerConnection.addIceCandidate(new RTCIceCandidate(data));
      //     }
      //   });
      // });
      onSnapshot(collection(roomRef, 'callerCandidates'), snapshot => {
        snapshot.docChanges().forEach(async change => {
          if (change.type === 'added') {
            const data = change.doc.data();
            console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
            await peerConnection.addIceCandidate(new RTCIceCandidate(data));
          }
        });
      })
      // Listening for remote ICE candidates above
    }

  }

  return (
    <>

      <button
        className="mdc-button mdc-button--raised"
        id="cameraBtn"
        onClick={async () => await openUserMedia()}
      // startIcon={<icon className="material-icons">perm_camera_mic</icon>}
      >
        Open camera & microphone
      </button>

      <button disabled id="createBtn">
        <i aria-hidden="true">group_add</i>
        <span>Create room</span>
      </button>

      <button disabled id="joinBtn">
        <i aria-hidden="true">group</i>
        <span>Join room</span>
      </button>

      <DialogBox
        open={dialogOpen}
        onClose={handleCloseDialog}
        onConfirm={handleConfirmDialog}
      />

      <button disabled id="hangupBtn">
        <i aria-hidden="true">close</i>
        <span>Hangup</span>
      </button>

      <br />
      <span>{textRoomId}</span>

      <br />
      <div id="videos">
        <video ref={myLocalVideoRef} id="localVideo" muted autoPlay playsInline />
        <video ref={myRemoteVideoRef} id="remoteVideo" muted autoPlay playsInline />
      </div>


    </>
  )
}

export default App
