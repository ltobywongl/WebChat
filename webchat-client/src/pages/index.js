import Head from 'next/head';
import { Inter } from 'next/font/google'
import { useState, useEffect, useRef } from 'react';
import io from "socket.io-client";
import { useSession, signIn, signOut } from "next-auth/react"
import { typeOf } from 'tls';
let socket;

const inter = Inter({ subsets: ['latin'] })

export default function Home() {
  const { data: session, status } = useSession();
  const [Messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [newBatchCount, setNewBatchCount] = useState(0);
  const [roomList, setRoomList] = useState([]);
  const [newRoomName, setNewRoomName] = useState("");
  const messagesEndRef = useRef(null);
  const topMessageRef = useRef(null);
  const createRoomRef = useRef(null);
  const dropDownMenuRef = useRef(null);
  const dropDownMenuRefTwo = useRef(null);
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

  function createRoom(roomType, roomName) {
    if (status === "authenticated" && typeof roomName === "string" && roomName.length <= 32) {
      if (confirm(`Confirm creating room (${roomName})?`)) {
        fetch(`/api/create-room/${roomType}/${roomName}`).then(res => res.json())
          .then(data => {
            console.log(data)
            setRoomList(roomList => [data, ...roomList])
          })
        createRoomRef?.current?.classList.add("hidden")
      }
    }
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
            <div className='avatar' onMouseEnter={() => dropDownMenuRefTwo?.current?.classList.remove("hidden")} onMouseLeave={() => dropDownMenuRefTwo?.current?.classList.add("hidden")}>
              <img className='h-12 w-12 flex-none rounded-full bg-gray-50' src={session.user.image} />
              <div className='dropdown-menu-padding'></div>
              <div className='dropdown-menu text-sm border border-solid border-indigo-400 bg-indigo-950 hidden' ref={dropDownMenuRefTwo}>
                <div className='m-4 w-full text-white'>Signed in as<br />{session?.user?.name}</div>
                <div className='dropdown-divider'></div>
                <button className='p-4 w-full text-white bg-indigo-950 hover:bg-blue-400' onClick={() => signOut()}>Sign Out</button>
              </div>
            </div>
          </div>
          <div className='overflow-scroll h-full'>
            <div className='conversation clickable' onClick={() => createRoomRef?.current?.classList.contains("hidden") ? createRoomRef?.current?.classList.remove("hidden") : createRoomRef?.current?.classList.add("hidden")}>
              Create Room
            </div>
            <div className='conversation hidden' ref={createRoomRef}>
              <div className='w-full max-w-md'>
                <div className="md:flex md:items-center mb-4">
                  <div className="md:w-1/2">
                    <label className="block text-gray-500 font-bold md:text-right mb-1 md:mb-0 pr-4">
                      Room Name
                    </label>
                  </div>
                  <div className="md:w-1/2">
                    <input className="w-full bg-gray-200 appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-purple-500"
                      type="text"
                      placeholder="My Room"
                      maxLength={32}
                      onChange={e => setNewRoomName(e.target.value)}
                      value={newRoomName} />
                  </div>
                </div>
                <div className="md:flex md:items-center">
                  <div className="md:w-1/2"></div>
                  <div className="md:w-1/2">
                    <button className="w-full shadow bg-purple-500 hover:bg-purple-400 focus:shadow-outline focus:outline-none text-white font-bold py-2 px-4 rounded" onClick={() => createRoom("room", newRoomName)}>
                      Create!
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {
              roomList[0] && (
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
          <div className='avatar' onMouseEnter={() => dropDownMenuRef?.current.classList.remove("hidden")} onMouseLeave={() => dropDownMenuRef?.current?.classList.add("hidden")}>
            <img className='h-12 w-12 flex-none rounded-full bg-gray-50' src={session.user.image} />
            <div className='dropdown-menu-padding'></div>
            <div className='dropdown-menu text-sm border border-solid border-indigo-400 bg-indigo-950 hidden' ref={dropDownMenuRef}>
              <div className='m-4 w-full text-white'>Signed in as<br />{session?.user?.name}</div>
              <div className='dropdown-divider'></div>
              <button className='p-4 w-full text-white bg-indigo-950 hover:bg-blue-400' onClick={() => signOut()}>Sign Out</button>
            </div>
          </div>
        </div>

        <div className='message-box bg-blue-200 m-5 p-5'>
          <h1 className='font-bold'>{(roomList[0]) && (roomList.find(element => element.roomid === roomId.current))?.name}</h1>
          <div id="messages" className='messages bg-slate-50 overflow-y-scroll border-y-2' onScroll={e => checkScroll(e.target.scrollTop)}>
            {Messages && (
              <ul>
                {Messages.slice().reverse().map((m, index) => {
                  const key = ("Msg" + index)
                  return (
                    <li key={key} ref={key === ("Msg" + newBatchCount) ? topMessageRef : null} id={key === ("Msg" + newBatchCount) ? "top" : null} className={m.self ? "mx-1 bg-green-50 flex justify-between gap-x-6 py-4" : "mx-1 flex justify-between gap-x-6 py-4"}>
                      <div className="flex gap-x-4">
                        <img className="h-12 w-12 text-sm sm:text-lg md:text-xl lg:text-2xl flex-none rounded-full bg-gray-50" src={m.image} alt={m.username} />
                        <div className="min-w-0 flex-auto">
                          <p className="text-sm sm:text-lg md:text-xl lg:text-2xl font-semibold leading-6 text-gray-900">{m.username}</p>
                          <p className="mt-1 whitespace-pre-line text-sm sm:text-lg md:text-xl lg:text-2xl leading-5 text-gray-500">{m.message}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <p className="mt-1 text-sm sm:text-lg md:text-xl lg:text-2xl leading-5 text-gray-500 break-words text-right">
                          {m.time.split(" ")[0].substr(5).replace('-', '/')}
                          <br className='time-split' />
                          {" "+m.time.split(" ")[1]}
                        </p>
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
