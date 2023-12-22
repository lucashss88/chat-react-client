import React, { useEffect, useState } from 'react'
import {over} from 'stompjs';
import SockJS from 'sockjs-client';

var stompClient =null;
const ChatRoom = () => {
    const [privateChats, setPrivateChats] = useState(new Map());     
    const [publicChats, setPublicChats] = useState([]); 
    const [tab,setTab] =useState("CHATROOM");
    const [unreadUsers, setUnreadUsers] = useState({});
    const [userData, setUserData] = useState({
        username: '',
        receivername: '',
        connected: false,
        message: ''
      });
    useEffect(() => {
      console.log(userData);
    }, [userData]);

    useEffect(() => {
        fetchEstablishmentData(); // Função para buscar os dados do estabelecimento
      }, []);
      
      const fetchEstablishmentData = async () => {
        try {
          const token = 'seu_token_aqui';
          const response = await fetch('http://localhost:3000/get_current_establishment', {
            method: 'GET',
            credentials: 'include', // Importante se as cookies forem usadas para autenticação
          });
      
          if (response.ok) {
            const establishmentData = await response.json();
            // Estabelecimento autenticado encontrado, atualize os dados no estado do React
            setUserData({
              ...userData,
              username: establishmentData.email,
              connected: true, 
            });
            connect();
          } else {
            // Trate a ausência de estabelecimento autenticado
          }
        } catch (error) {
          console.error('Erro ao buscar informações do estabelecimento:', error);
        }
      };
    
    useEffect(() => {
        checkAuthentication(); // Verifica a autenticação ao carregar o componente
      }, []);
    
      const checkAuthentication = async () => {
        try {
          const response = await fetch('http://localhost:3000/get_current_establishment', {
            method: 'GET',
            credentials: 'include',
          });
    
          if (response.ok) {
            const establishmentData = await response.json();
            // Estabelecimento autenticado encontrado, atualiza os dados no estado do React
            setUserData({
              ...userData,
              username: establishmentData.email,
              connected: true,
            });
            connect(); // Conecta automaticamente ao receber os dados do estabelecimento
          } else {
            // Se não estiver autenticado, não faz nada
          }
        } catch (error) {
          console.error('Erro ao verificar autenticação:', error);
        }
      }; 
    const connect =()=>{
        let Sock = new SockJS('http://localhost:8080/ws');
        stompClient = over(Sock);
        stompClient.connect({},onConnected, onError);
    }

    const onConnected = () => {
        setUserData({...userData,"connected": true});
        stompClient.subscribe('/chatroom/public', onMessageReceived);
        stompClient.subscribe('/user/'+userData.username+'/private', onPrivateMessage);
        userJoin();
    }

    const userJoin=()=>{
          var chatMessage = {
            senderName: userData.username,
            status:"JOIN"
          };
          stompClient.send("/app/message", {}, JSON.stringify(chatMessage));
    }

    const onMessageReceived = (payload)=>{
        var payloadData = JSON.parse(payload.body);
        const senderName = payloadData.senderName;
        switch(payloadData.status){
            case "JOIN":
                if(!privateChats.get(payloadData.senderName)){
                    privateChats.set(payloadData.senderName,[]);
                    setPrivateChats(new Map(privateChats));
                }
                break;
            case "MESSAGE":
                publicChats.push(payloadData);
                setPublicChats([...publicChats]);
                break;
        }
        setUnreadUsers({ ...unreadUsers, [senderName]: true });
    }
    
    const onPrivateMessage = (payload)=>{
        console.log(payload);
        var payloadData = JSON.parse(payload.body);
        const senderName = payloadData.senderName;
        if(privateChats.get(payloadData.senderName)){
            privateChats.get(payloadData.senderName).push(payloadData);
            setPrivateChats(new Map(privateChats));
        }else{
            let list =[];
            list.push(payloadData);
            privateChats.set(payloadData.senderName,list);
            setPrivateChats(new Map(privateChats));
        }
        setUnreadUsers({ ...unreadUsers, [senderName]: true });

    }

    const onError = (err) => {
        console.log(err);
        
    }

    const handleMessage =(event)=>{
        const {value}=event.target;
        setUserData({...userData,"message": value});
    }
    const sendValue=()=>{
            if (stompClient) {
              var chatMessage = {
                senderName: userData.username,
                message: userData.message,
                status:"MESSAGE"
              };
              console.log(chatMessage);
              stompClient.send("/app/message", {}, JSON.stringify(chatMessage));
              setUserData({...userData,"message": ""});
            }
    }

    const sendPrivateValue=()=>{
        if (stompClient) {
          var chatMessage = {
            senderName: userData.username,
            receiverName:tab,
            message: userData.message,
            status:"MESSAGE"
          };
          
          if(userData.username !== tab){
            privateChats.get(tab).push(chatMessage);
            setPrivateChats(new Map(privateChats));
          }
          stompClient.send("/app/private-message", {}, JSON.stringify(chatMessage));
          setUserData({...userData,"message": ""});
        }
    }

    const handleUsername=(event)=>{
        const {value}=event.target;
        setUserData({...userData,"username": value});
    }

    const registerUser=()=>{
        connect();
    }
    return (
    <div className="container">
        <div>
            <h1 className='title'>BEACH SERVICE</h1>
        </div>
        {userData.connected?
        <div className="chat-box">
            <div className="member-list">
                <ul>                    
                    {[...privateChats.keys()].map((name,index)=>(
                        <li onClick={()=>{setTab(name)}} className={`member ${tab===name && "active"} ${unreadUsers[name] ? 'unread' : ''}`} key={index}>{name}</li>
                    ))}
                </ul>
            </div>
            {tab==="CHATROOM" && <div className="chat-content">
                <ul className="chat-messages">
                    {publicChats.map((chat,index)=>(
                        <li className={`message ${chat.senderName === userData.username && "self"}`} key={index}>
                            {chat.senderName !== userData.username && <div className="avatar">{chat.senderName}</div>}
                            <div className="message-data">{chat.message}</div>
                            {chat.senderName === userData.username && <div className="avatar self">{chat.senderName}</div>}
                        </li>
                    ))}
                </ul>

                <div className="send-message">
                    <input type="text" className="input-message" placeholder="enter the message" value={userData.message} onChange={handleMessage} /> 
                    <button type="button" className="send-button" onClick={sendValue}>Enviar</button>
                </div>
            </div>}
            {tab!=="CHATROOM" && <div className="chat-content">
                <ul className="chat-messages">
                    {[...privateChats.get(tab)].map((chat,index)=>(
                        <li className={`message ${chat.senderName === userData.username && "self"}`} key={index}>
                            {chat.senderName !== userData.username && <div className="avatar">{chat.senderName}</div>}
                            <div className="message-data">{chat.message}</div>
                            {chat.senderName === userData.username && <div className="avatar self">{chat.senderName}</div>}
                        </li>
                    ))}
                </ul>

                <div className="send-message">
                    <input type="text" className="input-message" placeholder="enter the message" value={userData.message} onChange={handleMessage} /> 
                    <button type="button" className="send-button" onClick={sendPrivateValue}>Enviar</button>
                </div>
            </div>}
        </div>
        :
        
        <div className="register">
            <input
                    id="user-name"
                    placeholder="Digite seu nome"
                    name="userName"
                    value={userData.username}
                    onChange={handleUsername}
                    margin="normal"
            />
            <button type="button" onClick={registerUser} className="conect">
                        Conectar
            </button> 
        </div>}
    </div>
    )
}

export default ChatRoom
