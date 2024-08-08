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
import LanguageSwitcher from "./LanguageSwitcher";
import { useTranslations } from 'next-intl';
import { Checkbox } from "primereact/checkbox";

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
  const [files, setFiles] = useState<InsFile[]>([]);
  const [progress, setProgress] = useState<{ [key: string]: number }>({});
  const [incomingFiles, setIncomingFiles] = useState<InsFile[]>([]);
  const [downloadedFiles, setDownloadedFiles] = useState<{ [key: string]: boolean }>({});
  const [uploaded, setUploaded] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useRef<Toast>(null);
  const searchParams = useSearchParams();
  const t = useTranslations();
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
        toast.current?.show({ severity: 'error', summary: t("error"), detail: t("could-not-connect"), life: 3000 });
        setConnected(false);
      }
      else {
        setConnected(false);
      }
    });

    //sender
    peerInstance.on('connection', (conn) => {
      toast.current?.show({ severity: 'info', summary: t("info"), detail: t("connection-established"), life: 3000 });
      setConn(conn);
      setConnected(true);
      setUploaded(false);
      setProgress({});

      //sender
      conn.on('close', function () {
        toast.current?.show({ severity: 'error', summary: t("error"), detail: t("connection-closed"), life: 3000 });
        setConn(null);
        setConnected(false);
      });
    });

    setPeer(peerInstance);

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [conn]);

  const handleCopyClipboard = async () => {
    await navigator.clipboard.writeText(url);
    toast.current?.show({ severity: 'info', summary: t("info"), detail: t("copied"), life: 3000 });
  }

  const connectToPeer = () => {
    if (peer && remotePeerId) {
      const connection = peer.connect(remotePeerId);

      //receiver getting data from sender
      connection.on('data', (data: any) => {
        if (typeof (data) === "string" && data === "finished") {
          toast.current?.show({ severity: 'info', summary: t("info"), detail: t("all-files-received"), life: 3000 });
        } else {
          const file = incomingFiles.find((f: InsFile) => f.uuid === data.uuid);
          if (!file) {
            setIncomingFiles((prevFiles) => [...prevFiles, data]);

            connection.send({ name: data.name, uuid: data.uuid })
          }
        }
      });

      //receiver
      connection.on('close', function () {
        toast.current?.show({ severity: 'error', summary: t("error"), detail: t("connection-closed"), life: 3000 });
        setConn(null);
        setConnected(false);
      });

      //receiver
      connection.on('open', () => {
        toast.current?.show({ severity: 'info', summary: t("info"), detail: t("connection-established"), life: 3000 });
        setConn(connection);
        setConnected(true);
      });

    }
  };

  const onUploadClick = async () => {
    if (files.length > 0) {
      setUploaded(true);
      if (conn) {
        for (const file of files) {
          const isValidType = ACCEPTED_TYPES.some(type => file.type.startsWith(type));
          if (isValidType) {
            await new Promise<void>((resolve, reject) => {
              conn.send(file);
              conn.on('data', (data: any) => {
                setProgress((prevProgress) => ({
                  ...prevProgress,
                  [data.name]: 100,
                }));
                resolve();
              });

              conn.on('error', (err) => {
                reject(err);
              });
            });
          } else {
            toast.current?.show({ severity: 'warn', summary: t("warning"), detail: `${t("unsupported-file")} ${t("file-name")}: ${file.name}`, life: 3000 });
          }
        }
        conn.send("finished");
        toast.current?.show({ severity: 'info', summary: t("info"), detail: t("all-files-sent"), life: 3000 });
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

      for (let i = 0; i < e.target.files.length; i++) {
        fileList.push({
          uuid: generateUUID(),
          name: e.target.files[i].name,
          type: e.target.files[i].type,
          size: e.target.files[i].size,
          file: e.target.files[i]
        })
      }

      setFiles(fileList);
    }
  };

  const onChooseClick = () => {
    fileInputRef.current?.click();
    setUploaded(false);
  }

  const onClearClick = () => {
    fileInputRef!.current!.value = '';
    setFiles([]);
    setProgress({});
    setUploaded(false);
  }

  const handleDownload = (file: InsFile) => {
    download(file.file || '', file.name || "File Name", file.type)
    setDownloadedFiles((downloadedFiles) => ({
      ...downloadedFiles,
      [file.name]: true,
    }));
  }

  return (
    <div>
      <Toast ref={toast} />
      <div className="ins-p-8">
        <div className="card">
          <div className="flex align-items-center justify-content-between">
            <h1>{t("app-name")}</h1>
            <LanguageSwitcher />
          </div>
          <Card className="px-3">
            {
              remotePeerId ?
                <>
                  <div>
                    <Button label={t("allow-connection")} severity="info" disabled={!remotePeerId || connected || !peerId} onClick={connectToPeer} />
                    <Button label={t("disconnect")} className="ml-3" severity="danger" disabled={!connected} onClick={closeConnection} />
                  </div>
                  <div className="card flex flex-column md:flex-row gap-3 mt-3">
                    <div className="flex-1">
                      {!connected ?
                        <Message severity="warn" text={t("dont-grant-permission")} /> :
                        <Message severity="warn" text={t("transfer-will-begin")} />
                      }
                    </div>
                  </div>
                </> :
                <>
                  <div className="p-inputgroup">
                    <Button label={t("create-connection-url")} severity="info" disabled={!!url || !peerId} onClick={onCreateConnectionClick} />
                  </div>
                  <div className="card flex flex-column md:flex-row gap-3 mt-3">
                    <div className="p-inputgroup flex-1">
                      <InputText value={url} disabled />
                      <span className="p-inputgroup-addon p-0">
                        <Button icon="pi pi-clipboard" severity="secondary" tooltip="Copy to clipboard" disabled={!url} onClick={handleCopyClipboard} />
                      </span>
                    </div>
                    <div className="flex-1">
                      <Message severity="info" text={t("copy-send-url")} />
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
                            <Message severity="info" text={`${t("connected")} ${t("waiting-files")}`} />
                            <ColorPicker name="connectionStatus" disabled format="hex" value={"00ff00"} />
                          </div> :
                          <div className="flex align-items-center justify-content-between">
                            <div className="flex align-items-center justify-content-start gap-2">
                              <Message severity="warn" text={t("waiting-connection")} />
                              <ColorPicker name="connectionStatus" disabled format="hex" value={"ff0000"} />
                            </div>
                          </div>
                      }
                      <h5>{t("incoming-files")}</h5>
                      {incomingFiles.length > 0 ? incomingFiles.map((file) => (
                        <div className="grid mb-3 flex align-items-center" key={file.uuid}>
                          <div className="col-5">
                            {file.name}
                          </div>
                          <div className="col-3">
                            <Tag style={{ fontSize: '12px' }} value={formatBytes(file.size)} severity="warning" />
                          </div>
                          <div className="col-1">
                            <Checkbox checked={downloadedFiles[file.name] ? true : false} disabled></Checkbox>
                          </div>
                          <div className="col-3">
                            <Button label={t("download")} icon="pi pi-download" severity="success" style={{ marginLeft: '0.5rem' }} onClick={() => handleDownload(file)} />
                          </div>
                        </div>
                      )) :
                        <div>{t("no-incoming-files")}</div>
                      }

                    </div>
                  </div> :
                  <div className="col-12 pt-0">
                    <div className="card mb-0 px-3">
                      {
                        connected ?
                          <div className="grid flex">
                            <div className="flex flex-1 align-items-center justify-content-start gap-2">
                              <Message severity="info" text={`${t("connected")} ${t("can-send-files")}`} />
                              <ColorPicker name="connectionStatus" disabled format="hex" value={"00ff00"} />
                            </div>
                          </div> :
                          <div className="flex align-items-center justify-content-start gap-2">
                            <Message severity="warn" text={t("waiting-connection")} />
                            <ColorPicker name="connectionStatus" disabled format="hex" value={"ff0000"} />
                          </div>
                      }
                      <div className="grid flex align-items-center mt-3">
                        <div className="col">
                          <input ref={fileInputRef} accept="image/*,video/*" type="file" multiple onChange={handleFileChange} style={{ display: 'none' }} />
                          <Button icon="pi pi-images" tooltip={t("choose")} tooltipOptions={{ position: 'bottom' }} style={{ marginRight: '0.5rem' }}
                            disabled={uploaded} rounded outlined severity="info" aria-label={t("choose")} onClick={onChooseClick} />
                          <Button icon="pi pi-upload" tooltip={t("send")} tooltipOptions={{ position: 'bottom' }} style={{ marginRight: '0.5rem' }}
                            disabled={!connected || files.length === 0 || uploaded} rounded outlined severity="success" aria-label={t("send")} onClick={onUploadClick} />
                          <Button icon="pi pi-times" tooltip={t("clear")} tooltipOptions={{ position: 'bottom' }} style={{ marginRight: '0.5rem' }}
                            disabled={files.length === 0 || uploaded} rounded outlined severity="danger" aria-label={t("clear")} onClick={onClearClick} />
                        </div>
                      </div>
                      <h5>{t("files-to-upload")}</h5>
                      {files.length > 0 ? files.map((file: any) => (
                        <div className="grid mb-3 flex align-items-center" key={file.uuid}>
                          <div className="col-5">
                            {file.name}
                          </div>
                          <div className="col-3">
                            <Tag style={{ fontSize: '12px' }} value={formatBytes(file.size)} severity="warning" />
                          </div>
                          <div className="col-4">
                            <ProgressBar value={progress[file.name] || 0}></ProgressBar>
                          </div>
                        </div>
                      )) :
                        <div>{t("no-files-selected")}</div>
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
