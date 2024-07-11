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
  // const [file, setFile] = useState<File | null>(null);
  const [remotePeerId, setRemotePeerId] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const [connected, setConnected] = useState<boolean>(false);
  const [totalSize, setTotalSize] = useState(0);
  const [selectedFileCount, setSelectedFileCount] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [incomingFiles, setIncomingFiles] = useState<Data[]>([]);

  const toast = useRef<Toast>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const _token = searchParams.get('token');

    if (_token) {
      setRemotePeerId(_token);
    }

    const peerInstance = new Peer()
    peerInstance.on('open', (id) => {
      setPeerId(id);
    }).on('error', (err) => {
      if (err.message.startsWith('Could not connect to peer')) {
        //TODO alert
      }
      else {
        console.log(err)
        //TODO alert
      }
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
      setConn(connection);
      setConnected(true);

      connection.on('data', function (receivedData) {
        let data = receivedData as Data
        console.log(data);
        
        setIncomingFiles((prev) => [...prev, data]);
      })

      connection.on('close', function () {
        console.log("Connection closed");
        //TODO alert
        setConn(null);
      });
    }
  };

  // const sendFile = () => {
  //   if (conn && file) {
  //     let blob = new Blob([file], { type: file.type });
  //     conn.send({
  //       file: blob,
  //       fileName: file.name,
  //       fileType: file.type
  //     });
  //   }
  // };

  const onUploadClick = async () => {
    if (files.length > 0) {
      for (let file of files) {
        if (conn) {
          let blob = new Blob([file], { type: file.type });
          conn.send({
            file: blob,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
          });
        }
      }
    }
  }

  const onCreateConnectionClick = async () => {
    setUrl(`${document.location.origin}?token=${peerId}`)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      let _totalSize = 0;
      let newFiles = Array.from(e.target.files);

      for (let i = 0; i < newFiles.length; i++) {
        _totalSize += newFiles[i].size || 0;
      }

      setTotalSize(_totalSize);
      setFiles(newFiles);
      setSelectedFileCount(newFiles.length);
    }
  };

  const onChooseClick = () => {
    fileInputRef.current?.click();
  }

  const onClearClick = () => {
    if (files.length > 0) {
      setFiles([]);
      setSelectedFileCount(0);
      setTotalSize(0);
      fileInputRef!.current!.value = '';
    }
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
                  <Button label={"Allow Connection"} severity="info" disabled={!remotePeerId || connected} onClick={connectToPeer} />
                  {!connected && <Message severity="warn" className="ml-3" text={"If you do not know the person who sent you this link, do not grant permission."} />}
                </div>
                {
                  connected &&
                  <div className="card flex  align-items-center justify-content-start mt-3">
                    <Message severity="warn" text={"The file transfer will start as soon as the sender clicks the send button."} />
                    <i className="pi pi-spin pi-spinner ml-2" style={{ fontSize: '2rem' }}></i>
                  </div>
                }

                <div className="card mb-0 p-3" style={{ borderRadius: "0 0 0 0" }}>
                  <h5>{"incoming-files"}</h5>
                  {incomingFiles.length > 0 ? incomingFiles.map((file) => (
                    <div className="grid mb-3 flex align-items-center" key={file.fileName}>
                      <div className="col-5">
                        {file.fileName}
                      </div>
                      <div className="col-3">
                        <Tag value={formatBytes(file.fileSize)} severity="warning" />
                      </div>
                    </div>
                  )) :
                    <div>{"no-incoming-files"}</div>
                  }
                </div>
              </> :
              <>
                <div className="card flex  align-items-center justify-content-start">
                  <Button label={"Create Connection Url"} severity="info" disabled={!!url} onClick={onCreateConnectionClick} />
                </div>

                {url && <div className="flex align-items-center mt-5">
                  <InputText value={url} disabled />
                  <Button icon="pi pi-clipboard" severity="secondary" tooltip="Copy to clipboard" disabled={!url} onClick={handleCopyClipboard} />
                  <Message severity="info" className="ml-3" text={"Copy and send this link to the person you want to send the files to."} />
                </div>}

                {/* <div className="card flex align-items-center mt-5">
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
                </div> */}

                <div className="grid mt-3">
                  <div className="col-12">
                    <div className="card mb-0 p-3" style={{ borderRadius: "6px 6px 0 0" }}>
                      <div className="grid flex align-items-center">
                        <div className="col-6">
                          <input ref={fileInputRef} accept="image/*,video/*" type="file" multiple onChange={handleFileChange} style={{ display: 'none' }} />
                          <Button icon="pi pi-images" tooltip={"choose"} tooltipOptions={{ position: 'bottom' }} style={{ marginRight: '0.5rem' }}
                            rounded outlined severity="info" aria-label={"choose"} onClick={onChooseClick} />
                          <Button icon="pi pi-upload" tooltip={"upload"} tooltipOptions={{ position: 'bottom' }} style={{ marginRight: '0.5rem' }}
                            rounded outlined severity="success" aria-label={"upload"} onClick={onUploadClick} />
                          <Button icon="pi pi-times" tooltip={"clear"} tooltipOptions={{ position: 'bottom' }} style={{ marginRight: '0.5rem' }}
                            rounded outlined severity="danger" aria-label={"clear"} onClick={onClearClick} />
                        </div>
                        <div className="col-6 text-right">
                          <Message severity="info" className="mr-3" text={`${"size"}: ${formatBytes(totalSize)}`} />
                        </div>
                      </div>
                    </div>
                    <div className="card mb-0 p-3" style={{ borderRadius: "0 0 0 0" }}>
                      <h5>{"files-to-upload"}</h5>
                      {files.length > 0 ? files.map((file) => (
                        <div className="grid mb-3 flex align-items-center" key={file.name}>
                          <div className="col-5">
                            {file.name}
                          </div>
                          <div className="col-3">
                            <Tag value={formatBytes(file.size)} severity="warning" />
                          </div>
                          <div className="col-4">
                            <ProgressBar value={uploadProgress[file.name] || 0}></ProgressBar>
                          </div>
                        </div>
                      )) :
                        <div>{"no-file-selected"}</div>
                      }
                    </div>
                    <div className="card mb-0 p-3" style={{ borderRadius: "0 0 6px 6px" }}>
                      <h5>{"uploaded-files"}</h5>
                      {uploadedFiles.length > 0 ? uploadedFiles.map((uploadedFile) => (
                        <div className="grid mb-3 flex align-items-center" key={uploadedFile.name}>
                          <div className="col-5">
                            {uploadedFile.name}
                          </div>
                          <div className="col-3">
                            <Tag value={formatBytes(uploadedFile.size)} severity="warning" />
                          </div>
                          <div className="col-4">
                            <ProgressBar value={100}></ProgressBar>
                          </div>
                        </div>
                      )) :
                        <div>{"no-uploaded-files"}</div>
                      }
                    </div>
                  </div>
                </div>

              </>
            }
          </Card>
        </div>
      </div>
    </div>
  );
}
