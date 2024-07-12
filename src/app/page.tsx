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
  const [incomingProgress, setIncomingProgress] = useState<{ [key: string]: number }>({});

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
        toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Could not connect to peer', life: 3000 });
        setConnected(false);
        console.log("48")
      }
      else {
        setConnected(false);
        console.log("53")
      }
    });

    peerInstance.on('connection', (conn) => {
      toast.current?.show({ severity: 'info', summary: 'Info', detail: "Connection established", life: 3000 });
      setConn(conn);
      setConnected(true);
      console.log("60")

      conn.on('close', function () {
        toast.current?.show({ severity: 'error', summary: 'Error', detail: "Connection closed", life: 3000 });
        setConn(null);
        setConnected(false);
        console.log("66")
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

      // connection.on('data', function (receivedData) {
      //   let data = receivedData as Data
      //   console.log(data);

      //   setIncomingFiles((prev) => [...prev, data]);
      // })

      connection.on('data', (data: any) => {
        if (data.type === 'file') {
          console.log(data);

          const fileInfo = data;
          const receivedChunks: BlobPart[] = [];
          setIncomingFiles((prev) => [...prev, fileInfo]);

          connection?.on('data', (chunk: any) => {
            console.log(chunk);
            if (chunk === 'end') {
              const blob = new Blob(receivedChunks);
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = fileInfo.fileName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);

              // setIncomingFiles((prev) => [...prev, fileInfo]);
              setIncomingProgress((prevProgress) => ({
                ...prevProgress,
                [fileInfo.name]: 100,
              }));
            } else {
              const progress = Math.round(((chunk.length + receivedChunks.length) * 100) / (fileInfo.fileSize));
              setIncomingProgress((prevProgress) => ({
                ...prevProgress,
                [fileInfo.name]: progress,
              }));

              receivedChunks.push(chunk);
            }
          });
        }
      });

      connection.on('close', function () {
        toast.current?.show({ severity: 'error', summary: 'Error', detail: "Connection closed", life: 3000 });
        setConn(null);
        setConnected(false);
        console.log("97");
      });

      connection.on('open', () => {
        toast.current?.show({ severity: 'info', summary: 'Info', detail: "Connection established", life: 3000 });
        setConn(connection);
        setConnected(true);
        console.log("104");
      });
    }
  };

  const CHUNK_SIZE = 64 * 1024; // 64 KB

  const onUploadClick = async () => {
    if (files.length > 0) {
      for (let file of files) {
        if (conn) {
          // let blob = new Blob([file], { type: file.type });
          // conn.send({
          //   file: blob,
          //   fileName: file.name,
          //   fileType: file.type,
          //   fileSize: file.size,
          // });
          const fileInfo = {
            type: 'file',
            fileName: file.name,
            fileSize: file.size,
          };
          conn.send(fileInfo);

          let offset = 0;

          const readChunk = () => {
            const reader = new FileReader();
            const slice = file.slice(offset, offset + CHUNK_SIZE);
            reader.onload = (e) => {
              if (e.target?.result) {
                conn.send(e.target.result);
                offset += CHUNK_SIZE;
                if (offset < file.size) {
                  readChunk();
                } else {
                  conn.send('end');
                }
              }
            };
            reader.readAsArrayBuffer(slice);
          };

          readChunk();
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
          <h1>Instant File Share</h1>
          <Card className="px-3">
            {
              remotePeerId ?
                <>
                  <div className="p-inputgroup">
                    <Button label={"Allow Connection"} severity="info" disabled={!remotePeerId || connected} onClick={connectToPeer} />
                  </div>
                  <div className="card flex flex-column md:flex-row gap-3 mt-3">
                    <div className="p-inputgroup flex-1">
                      {!connected ?
                        <Message severity="warn" text={"If you do not know the person who sent you this link, do not grant permission."} /> :
                        <Message severity="warn" text={"The file transfer will start as soon as the sender clicks the send button."} />
                      }
                    </div>
                  </div>
                </> :
                <>
                  <div className="p-inputgroup">
                    <Button label={"Create Connection Url"} severity="info" disabled={!!url} onClick={onCreateConnectionClick} />
                  </div>
                  <div className="card flex flex-column md:flex-row gap-3 mt-3">
                    <div className="p-inputgroup flex-1">
                      <InputText value={url} disabled />
                      <span className="p-inputgroup-addon p-0">
                        <Button icon="pi pi-clipboard" severity="secondary" tooltip="Copy to clipboard" disabled={!url} onClick={handleCopyClipboard} />
                      </span>
                    </div>
                    <div className="p-inputgroup flex-1">
                      <Message severity="info" text={"Copy and send this link to the person you want to send the files to."} />
                    </div>
                  </div>
                </>
            }
          </Card>

          <Card className="mt-3">
            <div className="grid">
              {
                remotePeerId ?
                  <div className="col-12 pt-0">
                    <div className="card mb-0 px-3" style={{ borderRadius: "0 0 0 0" }}>
                      {
                        connected ?
                          <Message severity="info" text={"Connected. Waiting for the files."} /> :
                          <Message severity="warn" text={"Waiting for the connection."} />
                      }
                      {/* <h5>{"incoming-files"}</h5>
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
                      } */}

                      <h5>{"incoming-files"}</h5>
                      {incomingFiles.length > 0 ? incomingFiles.map((file) => (
                        <div className="grid mb-3 flex align-items-center" key={file.fileName}>
                          <div className="col-6">
                            {file.fileName}
                          </div>
                          <div className="col-6">
                            <ProgressBar value={uploadProgress[file.fileName] || 0}></ProgressBar>
                          </div>
                        </div>
                      )) :
                        <div>{"no-incoming-files"}</div>
                      }





                    </div>
                  </div> :
                  <div className="col-12 pt-0">
                    <div className="card mb-0 pt-0 pl-3 pb-3">
                      {
                        connected ?
                          <Message severity="info" text={"Connected. You can send files."} /> :
                          <Message severity="warn" text={"Waiting for the connection."} />
                      }
                    </div>
                    <div className="card mb-0 p-3" style={{ borderRadius: "6px 6px 0 0" }}>
                      <div className="grid flex align-items-center">
                        <div className="col">
                          <input ref={fileInputRef} accept="image/*,video/*" type="file" multiple onChange={handleFileChange} style={{ display: 'none' }} />
                          <Button icon="pi pi-images" tooltip={"choose"} tooltipOptions={{ position: 'bottom' }} style={{ marginRight: '0.5rem' }}
                            rounded outlined severity="info" aria-label={"choose"} onClick={onChooseClick} />
                          <Button icon="pi pi-upload" tooltip={"upload"} tooltipOptions={{ position: 'bottom' }} style={{ marginRight: '0.5rem' }}
                            disabled={!connected} rounded outlined severity="success" aria-label={"upload"} onClick={onUploadClick} />
                          <Button icon="pi pi-times" tooltip={"clear"} tooltipOptions={{ position: 'bottom' }} style={{ marginRight: '0.5rem' }}
                            disabled={files.length === 0} rounded outlined severity="danger" aria-label={"clear"} onClick={onClearClick} />
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
              }
            </div>
          </Card>
        </div>
      </div >
    </div >
  );
}
