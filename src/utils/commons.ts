import Peer, { DataConnection, PeerErrorType, PeerError } from "peerjs";

export enum DataType {
    FILE = 'FILE',
    OTHER = 'OTHER'

}
export interface Data {
    file: Blob
    fileName: string
    fileType: string
    fileSize: number
    message?: string
}

export function formatBytes(bytes: number) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const formattedSize = parseFloat((bytes / Math.pow(1024, i)).toFixed(2));
    return `${formattedSize} ${sizes[i]}`;
}

// let peer: Peer | undefined
// let connectionMap: Map<string, DataConnection> = new Map<string, DataConnection>()

// export const PeerConnection = {
//     getPeer: () => peer,
//     startPeerSession: () => new Promise<string>((resolve, reject) => {
//         try {
//             peer = new Peer()
//             peer.on('open', (id) => {
//                 resolve(id)
//             }).on('error', (err) => {
//                 console.log(err)
//                 reject(err)
//             })
//         } catch (err) {
//             console.log(err)
//             reject(err)
//         }
//     }),
//     closePeerSession: () => new Promise<void>((resolve, reject) => {
//         try {
//             if (peer) {
//                 peer.destroy()
//                 peer = undefined
//             }
//             resolve()
//         } catch (err) {
//             console.log(err)
//             reject(err)
//         }
//     }),
//     connectPeer: (id: string) => new Promise<void>((resolve, reject) => {
//         if (!peer) {
//             reject(new Error("Peer doesn't start yet"))
//             return
//         }
//         if (connectionMap.has(id)) {
//             reject(new Error("Connection existed"))
//             return
//         }
//         try {
//             let conn = peer.connect(id, { reliable: true })
//             if (!conn) {
//                 reject(new Error("Connection can't be established"))
//             } else {
//                 conn.on('open', function () {
//                     console.log("Connect to: " + id)
//                     connectionMap.set(id, conn)
//                     peer?.removeListener('error', handlePeerError)
//                     resolve()
//                 }).on('error', function (err) {
//                     console.log(err)
//                     peer?.removeListener('error', handlePeerError)
//                     reject(err)
//                 })

//                 // When the connection fails due to expiry, the error gets emmitted
//                 // to the peer instead of to the connection.
//                 // We need to handle this here to be able to fulfill the Promise.
//                 const handlePeerError = (err: PeerError<`${PeerErrorType}`>) => {
//                     if (err.type === 'peer-unavailable') {
//                         const messageSplit = err.message.split(' ')
//                         const peerId = messageSplit[messageSplit.length - 1]
//                         if (id === peerId) reject(err)
//                     }
//                 }
//                 peer.on('error', handlePeerError);
//             }
//         } catch (err) {
//             reject(err)
//         }
//     }),
//     onIncomingConnection: (callback: (conn: DataConnection) => void) => {
//         peer?.on('connection', function (conn) {
//             console.log("Incoming connection: " + conn.peer)
//             connectionMap.set(conn.peer, conn)
//             callback(conn)
//         });
//     },
//     onConnectionDisconnected: (id: string, callback: () => void) => {
//         if (!peer) {
//             throw new Error("Peer doesn't start yet")
//         }
//         if (!connectionMap.has(id)) {
//             throw new Error("Connection didn't exist")
//         }
//         let conn = connectionMap.get(id);
//         if (conn) {
//             conn.on('close', function () {
//                 console.log("Connection closed: " + id)
//                 connectionMap.delete(id)
//                 callback()
//             });
//         }
//     },
//     sendConnection: (id: string, data: Data): Promise<void> => new Promise((resolve, reject) => {
//         if (!connectionMap.has(id)) {
//             reject(new Error("Connection didn't exist"))
//         }
//         try {
//             let conn = connectionMap.get(id);
//             if (conn) {
//                 conn.send(data)
//             }
//         } catch (err) {
//             reject(err)
//         }
//         resolve()
//     }),
//     onConnectionReceiveData: (id: string, callback: (f: Data) => void) => {
//         if (!peer) {
//             throw new Error("Peer doesn't start yet")
//         }
//         if (!connectionMap.has(id)) {
//             throw new Error("Connection didn't exist")
//         }
//         let conn = connectionMap.get(id)
//         if (conn) {
//             conn.on('data', function (receivedData) {
//                 console.log("Receiving data from " + id)
//                 let data = receivedData as Data
//                 callback(data)
//             })
//         }
//     }

// }