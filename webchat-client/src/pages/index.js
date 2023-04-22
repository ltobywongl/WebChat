import Head from 'next/head';
import { Inter } from 'next/font/google'
import Conversation from '@/components/conversation';
import { useState, useEffect, useRef } from 'react';
import io from "socket.io-client";
import { useSession, signIn, signOut } from "next-auth/react"
let socket;

const inter = Inter({ subsets: ['latin'] })

export default function Home() {
  const { data: session, status } = useSession();
  const [Messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  let connected = false;

  useEffect(() => {
    if (!connected && status === "authenticated") {
      socket = io("https://chat.tobywong.ga:2053", {
        secure: true,
        withCredentials: true
      });

      socket.on('connect', () => {
        console.log("joinroom");
        connected = true;
        socket.emit('joinroom', socket.id, session.user.name, session.user.image, "1");
      });

      socket.on('disconnect', () => {
        console.log("disconnected");
      });

      socket.on("message", (in1, in2, in3, in4) => {
        setMessages(Messages => [...Messages, { username: in1, image: in2, text: in3, time: in4 }]);
      })
    }
  }, [status]);

  useEffect(() => {
    scrollToBottom();
  }, [Messages]); 

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function sendMessage() {
    var today = new Date();
    var time = today.getFullYear() + "-" + (today.getMonth()+1) + "-" + today.getDate() + " " + today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    setMessages(Messages => [...Messages, { username: session.user.name, image: session.user.image, text: newMessage, time: time, self: true }]);
    setNewMessage("");
    socket?.emit('chat', socket.id, newMessage);
  }

  function barOpen() {
    document.getElementById("sideBar").style.display = "block";
    document.getElementById("sideBar").classList.add("go-expand");
    setTimeout(function () {
      if (document.getElementById("sideBar").classList.contains('full-width')) {
        document.getElementById("sideBar").classList.remove("go-expand");
      }
    }, 1000);
  }

  function barClose() {
    document.getElementById("sideBar").style.display = "none";
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
          <button className='login-button conversation bg-green-50' onClick={() => signIn()}>Sign In to use the app</button>
        </div>

        <div className={"topnav flex flex-row gap-4 p-2"}>
          <button className='text-slate-50 p-4 text-3xl' onClick={() => barOpen()}><b>☰ Menu</b></button>
          <h1><b>WebChat</b></h1>
        </div>

        <div>
          <button className='login-button conversation bg-green-50' onClick={() => signIn()}>Sign In to use the app</button>
        </div>
      </>
    )
  } else {
    //console.log(session.user)
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
            <img className='avatar w-10 h-10 rounded-full' src={session.user.image} />
          </div>
          <button className='login-button conversation bg-red-50' onClick={() => signOut()}>Sign Out</button>
          <Conversation id={10} />
          <Conversation id={11} />
          <Conversation id={12} />
          <Conversation id={13} />
          <Conversation id={14} />
        </div>

        <div className={"topnav flex flex-row gap-4 p-2"}>
          <button className='text-slate-50 p-4 text-3xl' onClick={() => barOpen()}><b>☰ Menu</b></button>
          <h1><b>WebChat</b></h1>
          <img className='avatar h-12 w-12 flex-none rounded-full bg-gray-50' src={session.user.image} />
        </div>

        <div className='m-3'>
          <h1>Global chat</h1>
          <div className='messages bg-slate-50 overflow-y-scroll border-y-2'>
            {Messages && (
              <ul>
                {Messages.map((m, id) => (
                  <li key={id} className={m.self ? "mx-1 bg-green-50 flex justify-between gap-x-6 py-5" : "mx-1 flex justify-between gap-x-6 py-5"}>
                    <div className="flex gap-x-4">
                      <img className="h-12 w-12 text-base sm:text-2xl md:text-xl lg:text-lg flex-none rounded-full bg-gray-50" src={m.image} alt={m.username} />
                      <div className="min-w-0 flex-auto">
                        <p className="text-base sm:text-2xl md:text-xl lg:text-lg font-semibold leading-6 text-gray-900">{m.username}</p>
                        <p className="mt-1 truncate text-base sm:text-2xl md:text-xl lg:text-lg leading-5 text-gray-500">{m.text}</p>
                      </div>
                    </div>
                    <div className="hidden sm:flex sm:flex-col sm:items-end">
                      <p className="mt-1 text-base sm:text-2xl md:text-xl lg:text-lg leading-5 text-gray-500 break-words">{m.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className='flex flex-row h-20 mx-3'>
          <textarea 
            className='h-full basis-11/12 block rounded-md border-0 py-1.5 pl-7 pr-20 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6' 
              onChange={e => setNewMessage(e.target.value)}
              value={newMessage}
          />
          <button className='ml-1 bg-green-100 h-full p-5 rounded-md basis-1/12' onClick={() => sendMessage()}>Send</button>
        </div>
      </>
    )
  }
}
