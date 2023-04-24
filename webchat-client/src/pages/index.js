import Head from 'next/head';
import { Inter } from 'next/font/google'
import { useState, useEffect, useRef } from 'react';
import io from "socket.io-client";
import { useSession, signIn, signOut } from "next-auth/react"
let socket;

const inter = Inter({ subsets: ['latin'] })

export default function Home() {
  const { data: session, status } = useSession();
  const [Messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [newBatchCount, setNewBatchCount] = useState(0);
  const [roomList, setRoomList] = useState([]);
  const messagesEndRef = useRef(null);
  const topMessageRef = useRef(null);
  const allowMove = useRef(false);
  const loadMessageMove = useRef(false);
  const batch = useRef(0);
  const oldScroll = useRef(1500);
  const roomId = useRef(1);
  const connected = useRef(false);

  useEffect(() => {
    if (!connected.current && status === "authenticated") {
      fetch(`/api/get-rooms`)
        .then((res) => res.json())
        .then((fetchdata) => {
          setRoomList(fetchdata);
        })

      socket = io("https://chat.tobywong.ga:2053", {
        secure: true,
        withCredentials: true,
        reconnection: true,
        reconnectionDelay: 5000,
        reconnectionAttempts: 100
      });

      socket.on('connect', () => {
        connected.current = true;
        enterRoom(roomId.current);
      });

      socket.on('disconnect', () => {
        connected.current = false;
        console.log("disconnected");
      });

      socket.on("message", (in1, in2, in3, in4) => {
        setMessages(Messages => [{ username: in1, image: in2, message: in3, time: in4 }, ...Messages]);
        allowMove.current = true;
      })
    }
  }, [status]);

  useEffect(() => {
    if (allowMove.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      allowMove.current = false;
    } else if (loadMessageMove.current) {
      topMessageRef.current.scrollIntoView({ behavior: "instant" });
      loadMessageMove.current = false;
    }
  }, [Messages])

  function enterRoom(roomid) {
    if (!connected) {
      return;
    }
    fetch(`/api/getmessages/${roomid}/0`)
      .then((res) => res.json())
      .then((fetchdata) => {
        fetchdata.forEach(element => {
          element.time = new Date(element.time);
          let HoursZ = element.time.getHours() >= 10 ? '' : '0';
          let MinutesZ = element.time.getMinutes() >= 10 ? '' : '0';
          let SecondsZ = element.time.getSeconds() >= 10 ? '' : '0';
          element.time = element.time.getFullYear() + "-" + (element.time.getMonth() + 1) + "-" + element.time.getDate() + " " + HoursZ + element.time.getHours() + ":" + MinutesZ + element.time.getMinutes() + ":" + SecondsZ + element.time.getSeconds();
        });
        setMessages(fetchdata);
        oldScroll.current = 0;
        allowMove.current = true;
      })
    socket.emit('enterroom', session.user.id, session.user.name, session.user.image, roomid);
    roomId.current = roomid;
  }

  function sendMessage() {
    if (!connected) {
      return;
    }
    var today = new Date();
    let HoursZ = today.getHours() >= 10 ? '' : '0';
    let MinutesZ = today.getMinutes() >= 10 ? '' : '0';
    let SecondsZ = today.getSeconds() >= 10 ? '' : '0';
    var time = today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate() + " " + HoursZ + today.getHours() + ":" + MinutesZ + today.getMinutes() + ":" + SecondsZ + today.getSeconds();
    setMessages(Messages => [{ username: session.user.name, image: session.user.image, message: newMessage, time: time, self: true }, ...Messages]);
    socket?.emit('chat', session.user.id, newMessage);
    setNewMessage("");
    allowMove.current = true;
  }

  function checkScroll(dist) {
    if (!connected) {
      return;
    }
    if (dist < oldScroll.current) {
      if (dist === 0) {
        batch.current = batch.current + 1;
        fetch(`/api/getmessages/${roomId.current}/${batch.current}`)
          .then((res) => res.json())
          .then((fetchdata) => {
            setNewBatchCount(fetchdata.length);
            fetchdata.forEach(element => {
              element.time = new Date(element.time);
              let HoursZ = element.time.getHours() >= 10 ? '' : '0';
              let MinutesZ = element.time.getMinutes() >= 10 ? '' : '0';
              let SecondsZ = element.time.getSeconds() >= 10 ? '' : '0';
              element.time = element.time.getFullYear() + "-" + (element.time.getMonth() + 1) + "-" + element.time.getDate() + " " + HoursZ + element.time.getHours() + ":" + MinutesZ + element.time.getMinutes() + ":" + SecondsZ + element.time.getSeconds();
            });
            setMessages(Messages => [...Messages, ...fetchdata]);
            loadMessageMove.current = true;
          })
      }
    }
    oldScroll.current = dist;
  }

  function barOpen() {
    document.getElementById("sideBar").style.display = "block";
    document.getElementById("sideBar").classList.add("go-expand");
    setTimeout(function () {
      document.getElementById("sideBar").classList.remove("go-expand");
    }, 1000);
  }

  function barClose() {
    document.getElementById("sideBar").classList.add("go-retract");
    setTimeout(function () {
      document.getElementById("sideBar").classList.remove("go-retract");
      document.getElementById("sideBar").style.display = "none";
    }, 950);
  }

  if (!session) {
    return (
      <>
        <Head>
          <title>Web Chat</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <div className="side-bar bg-slate-50 fixed top-0 left-0 right-0 hidden" id="sideBar">
          <div className={"topnav flex flex-row gap-4 p-2"}>
            <button className='text-slate-50 p-4 text-3xl' onClick={() => barClose()}><b>&times; Close</b></button>
            <h1><b>WebChat</b></h1>
          </div>
          <button className='login-button conversation bg-green-50' onClick={() => signIn('google')}>Sign In to use the app</button>
        </div>

        <div className={"topnav flex flex-row gap-4 p-2"}>
          <button className='text-slate-50 p-4 text-3xl' onClick={() => barOpen()}><b>☰ Menu</b></button>
          <h1><b>WebChat</b></h1>
        </div>

        <div>
          <button className='login-button conversation bg-green-50' onClick={() => signIn('google')}>Sign In to use the app</button>
        </div>
      </>
    )
  } else {
    return (
      <>
        <Head>
          <title>Web Chat</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <div className="side-bar bg-slate-50 fixed top-0 left-0 right-0 hidden" id="sideBar">
          <div className={"topnav flex flex-row gap-4 p-2"}>
            <button className='text-slate-50 p-4 text-3xl' onClick={() => barClose()}><b>&times; Close</b></button>
            <h1><b>WebChat</b></h1>
            <img className='avatar h-12 w-12 flex-none rounded-full bg-gray-50' src={session.user.image} />
          </div>
          <div className='overflow-scroll h-full'>
            <button className='login-button conversation bg-red-50' onClick={() => signOut()}>Sign Out</button>
            <div className='conversation clickable' onClick={() => { enterRoom(1); barClose() }}>
              Global Chat
            </div>
            {
              roomList && (
                roomList.map((roomData, index) => {
                  return (
                    <div className='conversation clickable' key={"room" + index} onClick={() => { enterRoom(roomData.roomid); barClose() }}>
                      {roomData.name}
                    </div>
                  )
                })
              )}

          </div>
        </div>

        <div className={"topnav flex flex-row gap-4 p-2"}>
          <button className='text-slate-50 p-4 text-3xl' onClick={() => barOpen()}><b>☰ Menu</b></button>
          <h1><b>WebChat</b></h1>
          <img className='avatar h-12 w-12 flex-none rounded-full bg-gray-50' src={session.user.image} />
        </div>

        <div className='message-box bg-green-200 m-5 p-5'>
          <h1>Global chat</h1>
          <div id="messages" className='messages bg-slate-50 overflow-y-scroll border-y-2' onScroll={e => checkScroll(e.target.scrollTop)}>
            {Messages && (
              <ul>
                {Messages.slice().reverse().map((m, index) => {
                  const key = ("Msg" + index)
                  return (
                    <li key={key} ref={key === ("Msg" + newBatchCount) ? topMessageRef : null} id={key === ("Msg" + newBatchCount) ? "top" : null} className={m.self ? "mx-1 bg-green-50 flex justify-between gap-x-6 py-5" : "mx-1 flex justify-between gap-x-6 py-5"}>
                      <div className="flex gap-x-4">
                        <img className="h-12 w-12 text-base sm:text-2xl md:text-xl lg:text-lg flex-none rounded-full bg-gray-50" src={m.image} alt={m.username} />
                        <div className="min-w-0 flex-auto">
                          <p className="text-base sm:text-2xl md:text-xl lg:text-lg font-semibold leading-6 text-gray-900">{m.username}</p>
                          <p className="mt-1 whitespace-pre-line text-base sm:text-2xl md:text-xl lg:text-lg leading-5 text-gray-500">{m.message}</p>
                        </div>
                      </div>
                      <div className="hidden sm:flex sm:flex-col sm:items-end">
                        <p className="mt-1 text-base sm:text-2xl md:text-xl lg:text-lg leading-5 text-gray-500 break-words">{m.time}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className='flex flex-row h-20'>
            <textarea
              className='h-full basis-11/12 block rounded-md border-0 py-1.5 pl-7 pr-20 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6'
              onChange={e => setNewMessage(e.target.value)}
              value={newMessage}
            />
            <button className='ml-1 bg-green-100 h-full p-5 rounded-md basis-1/12' onClick={() => sendMessage()}>Send</button>
          </div>
        </div>
      </>
    )
  }
}
