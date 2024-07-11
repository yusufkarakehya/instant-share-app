'use client';
import { Data, DataType, formatBytes } from "@/utils/commons";
import styles from "./page.module.css";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { useEffect, useRef, useState } from "react";
import { Toast } from "primereact/toast";
import { InputText } from "primereact/inputtext";
import { useSearchParams } from "next/navigation";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { ProgressBar } from "primereact/progressbar";
import Peer, { DataConnection } from "peerjs";
import { FloatLabel } from "primereact/floatlabel";

export default function Home() {
  const [peerId, setPeerId] = useState<string>('');
  const [peer, setPeer] = useState<Peer | null>(null);
  const [conn, setConn] = useState<DataConnection | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [remotePeerId, setRemotePeerId] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [connected, setConnected] = useState<boolean>(false);

  const toast = useRef<Toast>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const _token = searchParams.get('token');
    const _user = searchParams.get('user');

    if (_token && _user) {
      setRemotePeerId(_token);
      setFullName(_user);
    }

    const peerInstance = new Peer()
    peerInstance.on('open', (id) => {
      setPeerId(id);
    }).on('error', (err) => {
      console.log(err)
      //TODO alert
    });

    peerInstance.on('connection', (conn) => {
      console.log("Incoming connection: " + conn.peer)
      //TODO alert
      setConn(conn);
      setConnected(true);

      conn.on('close', function () {
        console.log("Connection closed")
        //TODO alert
        setConn(null);
      });

    });

    setPeer(peerInstance);

    return () => {
      peerInstance.destroy();
    };
  }, []);

  const handleCopyClipboard = async () => {
    await navigator.clipboard.writeText(url);
  }

  const connectToPeer = () => {
    if (peer && remotePeerId) {
      const connection = peer.connect(remotePeerId);
      if (!connection) {
        //TODO alert
        return;
      }
      setConn(connection);
      setConnected(true);

      connection.on('data', function (receivedData) {
        let data = receivedData as Data
        console.log(data);

        console.log(data.fileName);
      })

      connection.on('close', function () {
        console.log("Connection closed");
        //TODO alert
        setConn(null);
      });
    }
  };

  const sendFile = () => {
    if (conn && file) {
      let blob = new Blob([file], { type: file.type });
      conn.send({
        file: blob,
        fileName: file.name,
        fileType: file.type
      });
    }
  };

  const onCreateConnectionClick = async () => {
    if (!fullName) {
      alert('Please enter your Full Name');
      //TODO alert
      return;
    }

    setUrl(`${document.location.origin}?token=${peerId}&user=${fullName}`)
  }

  return (
    <div>
      <Toast ref={toast} />
      <div className="p-8">
        <div className="card">
          <Card title="Instant File Share">
            {remotePeerId ?
              <>
                <div>
                  <Button label={"Allow"} severity="info" disabled={!remotePeerId || connected} onClick={connectToPeer} />
                  {!connected && <Message severity="info" className="ml-3" text={`${fullName} requests permission to send you a file.`} />}
                </div>
                {
                  connected &&
                  <div className="card flex  align-items-center justify-content-start mt-3">
                    <Message severity="warn" text={`${fullName} is expected to start sending the files.`} />
                    <i className="pi pi-spin pi-spinner ml-2" style={{ fontSize: '2rem' }}></i>
                  </div>
                }
              </> :
              <>
                <div className="card flex  align-items-center justify-content-start">
                  <FloatLabel>
                    <InputText id="fullname" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={!!url} />
                    <label htmlFor="fullname">Full Name</label>
                  </FloatLabel>
                  <Button label={"Create Connection Url"} className="ml-3" severity="info" disabled={!!url} onClick={onCreateConnectionClick} />
                </div>

                <div className="flex align-items-center mt-5">
                  <InputText value={url} disabled />
                  <Button icon="pi pi-clipboard" severity="secondary" tooltip="Copy to clipboard" disabled={!url} onClick={handleCopyClipboard} />
                  <Message severity="info" className="ml-3" text={"Copy and send this link to the person you want to send the files to."} />
                </div>

                <div className="card flex align-items-center mt-5">
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                  />
                  <Button onClick={sendFile} disabled={!connected}>Send File</Button>
                  {
                    connected ?
                      <Message severity="info" className="ml-3" text={"Connected"} /> :
                      <Message severity="warn" className="ml-3" text={"Waiting for the connection"} />
                  }
                </div>

              </>
            }
          </Card>
        </div>
      </div>
    </div>
  );
}
