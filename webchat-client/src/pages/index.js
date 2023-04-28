import Head from 'next/head';
import { Inter } from 'next/font/google'
import { useState, useEffect, useRef } from 'react';
import io from "socket.io-client";
import { useSession, signIn, signOut } from "next-auth/react"
import { typeOf } from 'tls';
import { fetchData } from 'next-auth/client/_utils';
let socket;

const inter = Inter({ subsets: ['latin'] })

export default function Home() {
  const { data: session, status } = useSession();
  const [Messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [newBatchCount, setNewBatchCount] = useState(0);
  const [roomList, setRoomList] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [roomMembers, setRoomMembers] = useState([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const messagesEndRef = useRef(null);
  const topMessageRef = useRef(null);
  const createRoomRef = useRef(null);
  const inviteRef = useRef(null);
  const dropDownMenuRef = useRef(null);
  const dropDownMenuRefTwo = useRef(null);
  const allowMove = useRef(false);
  const loadMessageMove = useRef(false);
  const allowClearMessage = useRef(false);
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

      fetch(`/api/get-invitations`)
        .then((res) => res.json())
        .then((fetchdata) => {
          setInvitations(fetchdata);
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
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100)
      allowMove.current = false;
    } else if (loadMessageMove.current) {
      setTimeout(() => {
        topMessageRef.current?.scrollIntoView({ behavior: "instant" });
      })
      loadMessageMove.current = false;
    }
    if (allowClearMessage.current) {
      setNewMessage("");
    }
  }, [Messages])

  function enterRoom(roomid) {
    if (!connected) {
      return;
    }
    fetch(`/api/getmessages/${roomid}/0`)
      .then((res) => res.json())
      .then((fetchdata) => {
        fetchdata?.forEach(element => {
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
    if (roomid !== 1) {
      fetch(`/api/getroommembers/${roomid}`)
        .then((res) => res.json())
        .then((fetchdata) => {
          setRoomMembers(fetchdata);
        })
    } else {
      setRoomMembers([]);
    }
    socket?.emit('enterroom', session.user.id, session.user.name, session.user.image, roomid);
    roomId.current = roomid;
    if (!document.getElementById("roominfo").classList.contains("hidden")) {
      document.getElementById("roominfo").classList.add("hidden");
      document.getElementById("messages").classList.remove("hidden");
      document.getElementById("newmessagebox").classList.remove("hidden");
    }
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

  async function sendMessage() {
    if (!connected || !socket) {
      return;
    }
    var today = new Date();
    let HoursZ = today.getHours() >= 10 ? '' : '0';
    let MinutesZ = today.getMinutes() >= 10 ? '' : '0';
    let SecondsZ = today.getSeconds() >= 10 ? '' : '0';
    var time = today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate() + " " + HoursZ + today.getHours() + ":" + MinutesZ + today.getMinutes() + ":" + SecondsZ + today.getSeconds();
    await socket?.emit('chat', session.user.id, newMessage);
    setMessages(Messages => [{ username: session.user.name, image: session.user.image, message: newMessage, time: time, self: true }, ...Messages]);
    allowMove.current = true;
    allowClearMessage.current = true;
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

  function chatInfo() {
    if (document.getElementById("roominfo").classList.contains("hidden")) {
      document.getElementById("messages").classList.add("hidden");
      document.getElementById("newmessagebox").classList.add("hidden");
      document.getElementById("roominfo").classList.remove("hidden");
    } else {
      document.getElementById("roominfo").classList.add("hidden");
      document.getElementById("messages").classList.remove("hidden");
      document.getElementById("newmessagebox").classList.remove("hidden");
    }
  }

  function inviteToRoom(email) {
    var filter = /^[a-zA-Z0-9_.-]+@[a-zA-Z0-9]+[a-zA-Z0-9.-]+[a-zA-Z0-9]+\.[a-z]{1,4}$/;
    if (filter.test(email)) {
      fetch(`/api/invite-to-room/${roomId.current}/${email}`)
        .then(res => res.json())
        .then(fetchdata => alert(fetchdata))
      setInviteEmail("");
    } else {
      alert("Email in wrong format!")
    }
  }

  function roomCreateToggle() {
    if (createRoomRef?.current?.classList.contains("hidden")) {
      createRoomRef?.current?.classList.remove("hidden");
      if (!inviteRef?.current?.classList.contains("hidden")) {
        inviteRef?.current?.classList.add("hidden");
      }
    } else {
      createRoomRef?.current?.classList.add("hidden");
    }
  }

  function invitesToggle() {
    if (inviteRef?.current?.classList.contains("hidden")) {
      inviteRef?.current?.classList.remove("hidden");
      if (!createRoomRef?.current?.classList.contains("hidden")) {
        createRoomRef?.current?.classList.add("hidden");
      }
    } else {
      inviteRef?.current?.classList.add("hidden");
    }
  }

  function barOpen() {
    document.getElementById("sideBar").style.display = "block";
    document.getElementById("sideBar").classList.add("go-expand");
    setTimeout(function () {
      if (document.getElementById("sideBar")) {
        document.getElementById("sideBar").classList.remove("go-expand");
      }
    }, 1000);
  }

  function barClose() {
    document.getElementById("sideBar").classList.add("go-retract");
    setTimeout(function () {
      if (document.getElementById("sideBar")) {
        document.getElementById("sideBar").classList.remove("go-retract");
        document.getElementById("sideBar").style.display = "none";
      }
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

        <div className="font-mono side-bar bg-slate-50 fixed top-0 left-0 right-0 hidden" id="sideBar">
          <div className={"topnav flex flex-row gap-4 p-2"}>
            <button className='text-slate-50 font-sans p-4 text-3xl' onClick={() => barClose()}><b>&times; Close</b></button>
            <h1 className='font-sans'><b>WebChat</b></h1>
          </div>
          <button className='login-button conversation bg-green-50' onClick={() => signIn('google')}>Sign In to use the app</button>
        </div>

        <div className="font-mono topnav flex flex-row gap-4 p-2">
          <button className='text-slate-50 font-sans p-4 text-3xl' onClick={() => barOpen()}><b>☰ Menu</b></button>
          <h1 className='font-sans'><b>WebChat</b></h1>
        </div>

        <div>
          <button className='login-button font-mono conversation bg-green-50' onClick={() => signIn('google')}>Sign In to use the app</button>
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

        <div className="side-bar font-mono bg-slate-50 fixed top-0 left-0 right-0 hidden" id="sideBar">
          <div className={"topnav flex flex-row gap-4 p-2"}>
            <button className='text-slate-50 font-sans p-4 text-3xl' onClick={() => barClose()}><b>&times; Close</b></button>
            <h1 className='font-sans'><b>WebChat</b></h1>
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
            <div className='room-buttons border-b border-b-slate-500 flex'>
              <div className='room-button w-full p-4 text-center border-r border-r-slate-500 clickable bg-indigo-100' onClick={() => invitesToggle()}>
                Invites
              </div>
              <div className='room-button w-full p-4 text-center clickable bg-indigo-100' onClick={() => roomCreateToggle()}>
                Create Room
              </div>
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
            <div className='invite hidden' ref={inviteRef}>
              <div className='w-full'>
                {
                  invitations && (
                    invitations.map((invite, index) => {
                      return (
                        <div key={index} className="md:flex md:items-center p-3 border-b border-solid">
                          <div className="md:w-1/2">
                            Room: {invite.name}<br />Invite from {invite.inv_name} ({invite.inv_email})
                          </div>
                          <div className="md:w-1/2 flex gap-2">
                            <button
                              className='w-full shadow bg-green-500 hover:bg-green-400 focus:shadow-outline focus:outline-none text-white font-bold py-2 px-4 rounded'
                              onClick={() => {
                                fetch(`api/accept-invite/${invite.inv_id}`)
                                setInvitations(invitation => invitation.filter(item => item.inv_id !== invite.inv_id))
                              }}
                            >
                              Accept
                            </button>
                            <button
                              className='w-full shadow bg-rose-500 hover:bg-rose-400 focus:shadow-outline focus:outline-none text-white font-bold py-2 px-4 rounded'
                              onClick={() => {
                                fetch(`api/deny-invite/${invite.inv_id}`)
                                setInvitations(invitation => invitation.filter(item => item.inv_id !== invite.inv_id))
                              }}
                            >
                              Deny
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )
                }
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

        <div className={"topnav font-mono flex flex-row gap-4 p-2"}>
          <button className='text-slate-50 font-sans p-4 text-3xl' onClick={() => barOpen()}><b>☰ Menu</b></button>
          <h1 className='font-sans'><b>WebChat</b></h1>
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

        <div className='message-box font-mono bg-blue-200 m-5 p-3'>
          <h1 className='font-bold font-sans mb-1'><button className='mr-3 p-1 border-2 border-solid border-blue-300' onClick={() => chatInfo()}>☰</button>{(roomList[0]) && (roomList.find(element => element.roomid === roomId.current))?.name}</h1>
          <div id="roominfo" className='messages p-1 bg-slate-50 overflow-y-scroll hidden'>
            {
              roomId.current === 1 ? null :
                <>
                  <div className='font-bold text-sm sm:text-lg md:text-xl lg:text-2xl'>Invite new member:</div>
                  <div className='flex gap-1'>
                    <input className="w-full bg-gray-200 appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-purple-500"
                      type="email"
                      placeholder="user@example.com"
                      maxLength={254}
                      onChange={e => setInviteEmail(e.target.value)}
                      value={inviteEmail} />
                    <button type='submit' className='py-2 px-4 font-bold rounded focus:shadow-outline focus:outline-none text-lg bg-green-200 sm:text-xl md:text-2xl lg:text-3xl' onClick={() => inviteToRoom(inviteEmail)}>+Invite</button>
                  </div>
                </>
            }
            <div className='font-bold text-sm sm:text-lg md:text-xl lg:text-2xl'>Room members:</div>
            {
              roomMembers && (
                roomMembers.map((user, index) => {
                  return (
                    <p key={index} className='flex my-1 text-sm sm:text-lg md:text-xl lg:text-2xl leading-6 text-gray-900'>
                      <img className="h-8 w-8 mr-2 text-sm sm:text-lg md:text-xl lg:text-2xl flex-none rounded-full bg-gray-50" src={user.image} alt={user.username} />
                      {user.name}
                    </p>
                  )
                })
              )
            }
            {
              roomId.current === 1 ? <p>Not available in Global Chat</p> : null
            }
          </div>
          <div id="messages" className='messages bg-slate-50 overflow-y-scroll border-y-2' onScroll={e => checkScroll(e.target.scrollTop)}>
            {Messages && (
              <ul>
                {Messages.slice().reverse().map((m, index) => {
                  const key = ("Msg" + index)
                  return (
                    <li key={key} ref={key === ("Msg" + newBatchCount) ? topMessageRef : null} id={key === ("Msg" + newBatchCount) ? "top" : null}
                      className={m.self ? "mx-1 bg-green-50 max-w-full flex justify-between gap-x-6 py-4" : "mx-1 max-w-full flex justify-between gap-x-6 py-4"}
                    >
                      <div className="flex gap-x-4">
                        <img className="h-12 w-12 text-sm sm:text-lg md:text-xl lg:text-2xl flex-none rounded-full bg-gray-50" src={m.image} alt={m.username} />
                        <div className="min-w-0 flex-auto">
                          <p className="text-sm sm:text-lg md:text-xl lg:text-2xl font-semibold leading-6 text-gray-900">{m.username}</p>
                          <p className="message-container mt-1 whitespace-pre-line text-sm sm:text-lg md:text-xl lg:text-2xl leading-5 text-gray-500">{m.message}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <p className="mt-1 text-sm sm:text-lg md:text-xl lg:text-2xl leading-5 text-gray-500 break-words text-right">
                          {m.time.split(" ")[0].substr(5).replace('-', '/')}
                          <br className='time-split' />
                          {" " + m.time.split(" ")[1]}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div id='newmessagebox' className='flex flex-row h-20'>
            <textarea
              className='h-full basis-11/12 block rounded-md border-0 py-1.5 pl-7 pr-20 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6'
              onChange={(e) => setNewMessage(e.target.value)}
              value={newMessage}
            />
            <button className='ml-1 bg-green-100 h-full p-5 rounded-md basis-1/12' onClick={() => sendMessage()}>Send</button>
          </div>
        </div>
      </>
    )
  }
}
