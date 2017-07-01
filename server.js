
/** use socket.io with restify */
var io = socketio.listen(server.server);




/** socket auth and hand shake you can set uid here */




//  {userId:socketClientId}
var socketIOConnectedClients ={};
// {userId : [friendId,friendIdfriendId,...]}
var userFriends ={};

//  when user is offline store message here
// {userId:{senderId:[message,....]}}
var pendingMessage = {} ;


io.sockets.on('connection', function (socket) {
  
    var socketClientId = socket.id ;
    // this value will add on init function, we cannot use it from headers : as ios font-end  will change lots of code
    var userId = null ;


    var sendPendingMessages = function () {
        console.log('sending pending messages',pendingMessage);

        io.to(socketIOConnectedClients[userId]).emit('pendings', pendingMessage[userId]);
        // remove pending messages
        delete pendingMessage[userId] ;
    };

    

    // send message to user
    socket.on('msg', function (data,callback) {

        var message= data.message  ,to = data.to ;
        console.log('msg', message,to);
        var data  = {
            msg: message,
            uid : userId
        };
        // if client connected
        if(socketIOConnectedClients[to]){
            console.log('client  send message: ',to );

            io.to(socketIOConnectedClients[to]).emit('arrival', data);

        }
        else {
            // client not connected ***
            console.log('client not connected clientID: ',to );

            pendingMessage[to] = pendingMessage[to] || {} ;
            pendingMessage[to][userId] =  pendingMessage[to][userId] || [] ;
            pendingMessage[to][userId].push(message) ;
            console.log('save offline message ',pendingMessage)
        }

        if(typeof  callback == 'function') {
            callback('ACK ')
        }
    });


    /**
     * If user is not active on the app, or the app is closed,, and someone sent messages..
     * Those messages will be kept by server and will be delivered when user will be
     * initialized (emit)
     * - - - - - - - - - - - - - - - - - -
     * The parameter data received from the server is object contains all the messages
     **/
  


    //  set status to typing
    socket.on('typing', function (to,callback) {
        console.log('typing', to);

        var currentUserId = userId ;
        // if client connected
        if(socketIOConnectedClients[to]){
            io.to(socketIOConnectedClients[to]).emit('userTyping', userId);

        }
       else {
            // client not connected ***
            console.log('client not connected clientID: ',to );
        }
        if(typeof  callback == 'function') {
            callback('ACK ')
        }
    });

    //  Send message status
    socket.on('msgstatus', function (data,callback) {
        console.log('msgstatus', data);
        console.log('socketIOConnectedClients', socketIOConnectedClients);

        if(socketIOConnectedClients[data.to]){
            console.log('sending status ', data.to, data.message,data.status);
            io.to(socketIOConnectedClients[data.to]).emit('msgstatus',data);

        }
        else {
            // client not connected ***
            console.log('client not connected clientID: ',to );
        }

        if(typeof  callback == 'function') {
            callback('ACK ')
        }

    });

    

    //  init
    socket.on('init', function (data,callback) {

        var me = data.me ;

        // add connected user to socketIOConnectedClients
        //var userId =  getUserIdFromSocketHeader(socket) ;
        userId = me ;
        
        if(pendingMessage[userId]){
            console.log('sending pending messages');
            sendPendingMessages() ;
        }
        
        socketIOConnectedClients[userId] =  socketClientId ;



        var friends = data.friends ;
        console.log('init', me,friends);
        // store friedn list
        userFriends[userId] = friends || [] ;

        // notify all friends about online
        if(friends.length > 0 ){
            friends.forEach(function (friend) {
                if(socketIOConnectedClients[friend]){
                    console.log('notifi friend online ',friend , userId );
                    io.to(socketIOConnectedClients[friend]).emit('friendOnline', userId);
                }else{
                    console.log('notifi friend online ',friend , userId,'frind not connected' );
                }
                // call back ack
                if(typeof  callback == 'function')  callback('ACK online friends notifiyed ')


            })
        }else {
            // call back ack
            if(typeof  callback == 'function')  callback('ACK you don\'t send any friend  ')
        }


    });


    socket.on('disconnect', function(callback){
        console.log('user disconnected');




        // notify all friends about offline
        if(userFriends[userId].length > 0 ){
            userFriends[userId].forEach(function (friend) {

                if(socketIOConnectedClients[friend]){
                    console.log('notifi friend offline ',friend , userId );
                    io.to(socketIOConnectedClients[friend]).emit('friendOffLine', userId);

                }else{
                    console.log('notifi friend offline ',friend , userId,'frind not connected' );
                }


            })
        }

        // delete friedn list
        delete userFriends[userId]  ;



        // remove connected user from socketIOConnectedClients

        delete socketIOConnectedClients[userId];

        if(typeof  callback == 'function') {
            callback('ACK ')
        }
    });
});
