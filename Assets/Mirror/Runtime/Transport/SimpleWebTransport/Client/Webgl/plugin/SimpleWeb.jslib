// this will create a global object
const SimpleWeb = {
    webSockets: [],
    next: 1,
    GetWebSocket: function (index) {
        return SimpleWeb.webSockets[index]
    },
    AddNextSocket: function (webSocket) {
        var index = SimpleWeb.next;
        SimpleWeb.next++;
        SimpleWeb.webSockets[index] = webSocket;
        return index;
    },
    RemoveSocket: function (index) {
        SimpleWeb.webSockets[index] = undefined;
    },
};

function IsConnected(index) {
    var webSocket = SimpleWeb.GetWebSocket(index);
    if (webSocket) {
        return webSocket.readyState === webSocket.OPEN;
    }
    else {
        return false;
    }
}

function Connect(addressPtr, openCallbackPtr, closeCallBackPtr, messageCallbackPtr, errorCallbackPtr) {
    const address = Pointer_stringify(addressPtr);
    console.log("AAAA_Connecting to " + address);
    // Create webSocket connection.
    webSocket = new WebSocket(address);
    webSocket.binaryType = 'arraybuffer';
    const index = SimpleWeb.AddNextSocket(webSocket);

    // Connection opened
    webSocket.addEventListener('open', function (event) {
        console.log("AAAA_Connected to (connection opened) " + address);
        //Runtime.dynCall('vi', openCallbackPtr, [index]);
        Module['dynCall_vi'](openCallbackPtr, index);



    });
    webSocket.addEventListener('close', function (event) {
        console.log("AAA_Disconnected from " + address);
        //Runtime.dynCall('vi', closeCallBackPtr, [index]);
        Module['dynCall_vi'](closeCallBackPtr, index);
    });

    // Listen for messages
    webSocket.addEventListener('message', function (event) {
        if (event.data instanceof ArrayBuffer) {
            // TODO dont alloc each time
            var array = new Uint8Array(event.data);
            var arrayLength = array.length;

            var bufferPtr = _malloc(arrayLength);
            var dataBuffer = new Uint8Array(HEAPU8.buffer, bufferPtr, arrayLength);
            dataBuffer.set(array);

             console.log("AAAA_Message_messageCallbackPtr:" + messageCallbackPtr);
             console.log("AAAA_Message_index:" + index);
             console.log("AAAA_Message_bufferPtr:" + bufferPtr);
             console.log("AAAA_Message_arrayLength:" + arrayLength);
            //Runtime.dynCall('viii', messageCallbackPtr, [index, bufferPtr, arrayLength]);
            Module['dynCall_viii'](messageCallbackPtr, index, bufferPtr, arrayLength);
            _free(bufferPtr);
        }
        else {
            console.error("message type not supported")
        }
    });

    webSocket.addEventListener('error', function (event) {
        console.error('Socket Error', event);

        //Runtime.dynCall('vi', errorCallbackPtr, [index]);
        Module['dynCall_vi'](errorCallbackPtr, index);
    });

    return index;
}

function Disconnect(index) {
    var webSocket = SimpleWeb.GetWebSocket(index);
    if (webSocket) {
        webSocket.close(1000, "Disconnect Called by Mirror");
    }

    SimpleWeb.RemoveSocket(index);
}

function Send(index, arrayPtr, offset, length) {
    var webSocket = SimpleWeb.GetWebSocket(index);
    if (webSocket) {
        const start = arrayPtr + offset;
        const end = start + length;
        const data = HEAPU8.buffer.slice(start, end);
        webSocket.send(data);
        return true;
    }
    return false;
}


const SimpleWebLib = {
    $SimpleWeb: SimpleWeb,
    IsConnected,
    Connect,
    Disconnect,
    Send
};
autoAddDeps(SimpleWebLib, '$SimpleWeb');
mergeInto(LibraryManager.library, SimpleWebLib);