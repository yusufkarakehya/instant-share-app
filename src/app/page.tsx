'use client';
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
import { ColorPicker } from "primereact/colorpicker";
import download from "js-file-download";

interface InsFile {
  uuid: string
  name: string
  type: string
  size: number
  file: File
}

export default function Home() {
  const [peerId, setPeerId] = useState<string>('');
  const [peer, setPeer] = useState<Peer | null>(null);
  const [conn, setConn] = useState<DataConnection | null>(null);
  const [remotePeerId, setRemotePeerId] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const [connected, setConnected] = useState<boolean>(false);
  const [totalSize, setTotalSize] = useState(0);
  const [selectedFileCount, setSelectedFileCount] = useState(0);
  const [files, setFiles] = useState<InsFile[]>([]);
  const [progress, setProgress] = useState<{ [key: string]: number }>({});
  const [incomingFiles, setIncomingFiles] = useState<InsFile[]>([]);
  const [incomingProgress, setIncomingProgress] = useState<{ [key: string]: number }>({});
  const [uploaded, setUploaded] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useRef<Toast>(null);
  const searchParams = useSearchParams();

  const ACCEPTED_TYPES = ['image/', 'video/'];

  const closeConnection = () => {
    if (conn) {
      conn.close();
    }
    if (peer) {
      peer.destroy();
    }
  };

  useEffect(() => {
    const _token = searchParams.get('token');

    if (_token) {
      setRemotePeerId(_token);
    }

    const peerInstance = new Peer();
    peerInstance.on('open', (id) => {
      setPeerId(id);
    }).on('error', (err) => {
      if (err.message.startsWith('Could not connect to peer')) {
        toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Could not connect to peer', life: 3000 });
        setConnected(false);
      }
      else {
        setConnected(false);
      }
    });

    //sender
    peerInstance.on('connection', (conn) => {
      toast.current?.show({ severity: 'info', summary: 'Info', detail: "Connection established", life: 3000 });
      setConn(conn);
      setConnected(true);

      //sender
      conn.on('close', function () {
        toast.current?.show({ severity: 'error', summary: 'Error', detail: "Connection closed", life: 3000 });
        setConn(null);
        setConnected(false);
      });

      //sender getting data from receiver 
      conn.on('data', (data: any) => {
        setProgress((prevProgress) => ({
          ...prevProgress,
          [data.name]: 100,
        }));
      });

    });

    setPeer(peerInstance);

    window.addEventListener('beforeunload', closeConnection);

    return () => {
      window.removeEventListener('beforeunload', closeConnection);
    };
  }, [conn]);

  const handleCopyClipboard = async () => {
    await navigator.clipboard.writeText(url);
  }

  const connectToPeer = () => {
    if (peer && remotePeerId) {
      const connection = peer.connect(remotePeerId);

      //receiver getting data from sender
      connection.on('data', (data: any) => {
        download(data.file || '', data.name || "File Name", data.type)

        const file = incomingFiles.find((f: InsFile) => f.uuid === data.uuid);
        if (!file) {
          setIncomingFiles((prevFiles) => [...prevFiles, data]);
          setIncomingProgress((prevProgress) => ({
            ...prevProgress,
            [data.name]: 100,
          }));

          connection.send({ name: data.name, uuid: data.uuid })
        }
      });

      //receiver
      connection.on('close', function () {
        toast.current?.show({ severity: 'error', summary: 'Error', detail: "Connection closed", life: 3000 });
        setConn(null);
        setConnected(false);
      });

      //receiver
      connection.on('open', () => {
        toast.current?.show({ severity: 'info', summary: 'Info', detail: "Connection established", life: 3000 });
        setConn(connection);
        setConnected(true);
      });

    }
  };

  const onUploadClick = () => {
    if (files.length > 0) {
      setUploaded(true);
      for (let file of files) {
        const isValidType = ACCEPTED_TYPES.some(type => file.type.startsWith(type));
        if (isValidType) {
          try {
            if (conn) {
              conn.send(file);
            }
          } catch (error) {
            if (typeof error === "string") {
              toast.current?.show({ severity: 'error', summary: 'Error', detail: error, life: 3000 });
            } else if (error instanceof Error) {
              toast.current?.show({ severity: 'error', summary: 'Error', detail: error.message, life: 3000 });
            }
          }
        } else {
          toast.current?.show({ severity: 'warn', summary: "Warning", detail: `Unsupported file type. File Name: ${file.name}`, life: 3000 });
        }
      }
    }
  }

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const formattedSize = parseFloat((bytes / Math.pow(1024, i)).toFixed(2));
    return `${formattedSize} ${sizes[i]}`;
  }

  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = (c === 'x') ? ((r & 0x3) | 0x8) : r & 0xf;
      return v.toString(16);
    });
  }

  const onCreateConnectionClick = async () => {
    setUrl(`${document.location.origin}?token=${peerId}`)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      let fileList: InsFile[] = [];

      let _totalSize = 0;
      for (let i = 0; i < e.target.files.length; i++) {
        _totalSize += e.target.files[i].size || 0;
        fileList.push({
          uuid: generateUUID(),
          name: e.target.files[i].name,
          type: e.target.files[i].type,
          size: e.target.files[i].size,
          file: e.target.files[i]
        })
      }

      setTotalSize(_totalSize);
      setFiles(fileList);
      setSelectedFileCount(e.target.files.length);
    }
  };

  const onChooseClick = () => {
    fileInputRef.current?.click();
    setUploaded(false);
  }

  const onClearClick = () => {
    setSelectedFileCount(0);
    setTotalSize(0);
    fileInputRef!.current!.value = '';
    setFiles([]);
    setProgress({});
    setUploaded(false);
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
                    <Button label={"Allow Connection"} severity="info" disabled={!remotePeerId || connected || !peerId} onClick={connectToPeer} />
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
                    <Button label={"Create Connection Url"} severity="info" disabled={!!url || !peerId} onClick={onCreateConnectionClick} />
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
                          <div className="flex align-items-center justify-content-start gap-2">
                            <Message severity="info" text={"Connected. Waiting for the files."} />
                            <ColorPicker disabled format="hex" value={"00ff00"} />
                          </div> :
                          <div className="flex align-items-center justify-content-start gap-2">
                            <Message severity="warn" text={"Waiting for the connection."} />
                            <ColorPicker disabled format="hex" value={"ff0000"} />
                          </div>
                      }
                      <h5>{"Incoming Files"}</h5>
                      {incomingFiles.length > 0 ? incomingFiles.map((file) => (
                        <div className="grid mb-3 flex align-items-center" key={file.uuid}>
                          <div className="col-6">
                            {file.name}
                          </div>
                          <div className="col-6">
                            <ProgressBar value={incomingProgress[file.name] || 0}></ProgressBar>
                          </div>
                        </div>
                      )) :
                        <div>{"No Incoming Files"}</div>
                      }

                    </div>
                  </div> :
                  <div className="col-12 pt-0">
                    <div className="card mb-0 pt-0 pl-3 pb-3">
                      {
                        connected ?
                          <div className="grid flex align-items-center">
                            <div className="flex flex-1 align-items-center justify-content-start gap-2">
                              <Message severity="info" text={"Connected. You can send files."} />
                              <ColorPicker disabled format="hex" value={"00ff00"} />
                            </div>
                            <div className="flex flex-1 align-items-center justify-content-end gap-2">
                              <Message severity="info" className="mr-3" text={`Selected File Count: ${selectedFileCount}`} />
                              <Message severity="info" className="mr-3" text={`Total Size: ${formatBytes(totalSize)}`} />
                            </div>
                          </div> :
                          <div className="flex-1 align-items-center justify-content-start gap-2">
                            <Message severity="warn" text={"Waiting for the connection."} />
                            <ColorPicker disabled format="hex" value={"ff0000"} />
                          </div>
                      }
                    </div>
                    <div className="card mb-0 p-3" style={{ borderRadius: "6px 6px 0 0" }}>
                      <div className="grid flex align-items-center">
                        <div className="col">
                          <input ref={fileInputRef} accept="image/*,video/*" type="file" multiple onChange={handleFileChange} style={{ display: 'none' }} />
                          <Button icon="pi pi-images" tooltip={"Choose"} tooltipOptions={{ position: 'bottom' }} style={{ marginRight: '0.5rem' }}
                            rounded outlined severity="info" aria-label={"Choose"} onClick={onChooseClick} />
                          <Button icon="pi pi-upload" tooltip={"Upload"} tooltipOptions={{ position: 'bottom' }} style={{ marginRight: '0.5rem' }}
                            disabled={!connected || files.length === 0 || uploaded} rounded outlined severity="success" aria-label={"Upload"} onClick={onUploadClick} />
                          <Button icon="pi pi-times" tooltip={"Clear"} tooltipOptions={{ position: 'bottom' }} style={{ marginRight: '0.5rem' }}
                            disabled={files.length === 0} rounded outlined severity="danger" aria-label={"Clear"} onClick={onClearClick} />
                        </div>
                      </div>
                    </div>
                    <div className="card mb-0 p-3" style={{ borderRadius: "0 0 0 0" }}>
                      <h5>{"Files To Upload"}</h5>
                      {files.length > 0 ? files.map((file: any) => (
                        <div className="grid mb-3 flex align-items-center" key={file.uuid}>
                          <div className="col-5">
                            {file.name}
                          </div>
                          <div className="col-3">
                            <Tag value={formatBytes(file.size)} severity="warning" />
                          </div>
                          <div className="col-4">
                            <ProgressBar value={progress[file.name] || 0}></ProgressBar>
                          </div>
                        </div>
                      )) :
                        <div>{"No File Selected"}</div>
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
