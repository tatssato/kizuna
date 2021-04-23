import { IonContent, IonGrid, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonLabel, IonLoading, IonRow, IonSlide, IonText } from "@ionic/react";
import React, {useEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import {
  FilePayload,
  isTextPayload,
  Payload,
} from "../../../../../redux/commons/types";
import { getNextBatchGroupMessages } from "../../../../../redux/group/actions";
import {
  GroupMessageBatchFetchFilter,
  GroupMessagesOutput,
  GroupMessage,
} from "../../../../../redux/group/types";
import {
  base64ToUint8Array,
  monthToString,
  useAppDispatch,
} from "../../../../../utils/helpers";
import MediaIndex from "./MediaIndex";
import styles from "../../style.module.css";
import { sadOutline } from "ionicons/icons";

interface Props {
  groupId: string;
  fileMessages: GroupMessage[];
}

const Media: React.FC<Props> = ({ groupId, fileMessages }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchLoading, setFetchLoading] = useState<boolean>(false);

  const dispatch = useAppDispatch();
  const intl = useIntl();
  const infiniteFileScroll = useRef<HTMLIonInfiniteScrollElement>(null);
  const complete = () => infiniteFileScroll.current!.complete();

  const [indexedFileMessages, setIndexedFileMessages] = useState<{
    [key: string]: GroupMessage[];
  }>({});

  const indexMedia: (
    fileMessages: GroupMessage[]
  ) => {
    [key: string]: GroupMessage[];
  } = (fileMessages) => {
    let filteredMessages = fileMessages.filter(message => {
      const payload: Payload = message.payload;
      return !isTextPayload(payload) && payload.fileType !== "OTHER"
    })
    let indexedFiles: {
      [key: string]: GroupMessage[];
    } = indexedFileMessages;
    if (filteredMessages.length > 0) {
      let monthNumber = new Date(
        fileMessages[0].timestamp[0] * 1000
      ).getMonth();
      let month = monthToString(monthNumber, intl)!;
      if (!indexedFiles[month]) {
        indexedFiles[month] = [];
      }
      fileMessages.forEach((fileMessage: GroupMessage) => {
        const currMonth = monthToString(
          new Date(fileMessage.timestamp[0] * 1000).getMonth(),
          intl
        );
        if (currMonth !== month) {
          month = currMonth!;
          indexedFiles[month] = [];
        }
        const currArr = indexedFiles[currMonth!];
        const payload: Payload = fileMessage.payload;
        if (
          !isTextPayload(payload) &&
          (payload.fileType === "IMAGE" || payload.fileType === "VIDEO")
        ) {
          currArr.push(fileMessage);
        }
      });
    }
    return indexedFiles;
  };

  const onScrollBottom = (complete: () => Promise<void>, files: GroupMessage[]) => {
    setFetchLoading(true);
    console.log("Details scrolls");
    // var lastFile: P2PMessage = Object.values(files)[Object.entries(files).length - 1];
    var lastFile: GroupMessage = files[files.length - 1]
    console.log("Details last file", lastFile);
    dispatch(
      getNextBatchGroupMessages({
        groupId: base64ToUint8Array(groupId),
        batchSize: 4,
        payloadType: { type: "FILE", payload: null },
        lastMessageTimestamp: lastFile !== undefined ? lastFile.timestamp : undefined,
        lastFetched: lastFile !== undefined ? Buffer.from(base64ToUint8Array(lastFile.groupMessageEntryHash)) : undefined
      })
    ).then((res: GroupMessagesOutput) => {
      console.log("here are the new files", res);
      let newFiles = Object.keys(res.groupMessagesContents).map((key: string) => {
        let message: GroupMessage = res.groupMessagesContents[key];
        return message
      });
      const indexedMedia: {
        [key: string]: GroupMessage[];
      } = indexMedia(newFiles);
      setIndexedFileMessages(indexedMedia);
      setFetchLoading(false)
    });
    complete();
    return
  }


  useEffect(() => {
    if (fileMessages) {
      const indexedMedia: {
        [key: string]: GroupMessage[];
      } = indexMedia(fileMessages);
      setIndexedFileMessages(indexedMedia);
      setLoading(false);
    } else {
      let filter: GroupMessageBatchFetchFilter = {
        groupId: base64ToUint8Array(groupId),
        batchSize: 4,
        payloadType: { type: "FILE", payload: null },
      };
      dispatch(getNextBatchGroupMessages(filter)).then(
        (res: GroupMessagesOutput) => {
          let fileMessages: (GroupMessage | undefined)[] = Object.keys(
            res.groupMessagesContents
          ).map((key: any) => {
            if (!isTextPayload(res.groupMessagesContents[key].payload)) {
              let message = res.groupMessagesContents[key];
              return message;
            } else {
              return undefined;
            }
          });

          let fileMessagesCleaned = fileMessages.flatMap(
            (x: GroupMessage | undefined) => (x ? [x] : [])
          );

          const indexedMedia: {
            [key: string]: GroupMessage[];
          } = indexMedia(fileMessagesCleaned);
          setIndexedFileMessages(indexedMedia);
          setLoading(false);
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return !loading ? (
    (Object.keys(indexedFileMessages).length !== 0) ? (
      <IonContent>
        <IonGrid>
          <IonRow>
            {Object.keys(indexedFileMessages).map((month: string) => {
              console.log(indexedFileMessages);
              const fileMessages = indexedFileMessages[month];
              let files: FilePayload[] = [];
              fileMessages.forEach((fileMessage: GroupMessage) => {
                if (!isTextPayload(fileMessage.payload)) {
                  files.push(fileMessage.payload);
                }
              });
      
              return (
                <MediaIndex
                  onCompletion={() => {
                    return true;
                  }}
                  key={month}
                  index={month}
                  fileMessages={fileMessages}
                  files={files}
                />
              );
            })}
          </IonRow>
          <IonRow>
            <IonInfiniteScroll
              threshold="10px"
              ref={infiniteFileScroll}
              position="bottom"
              onIonInfinite={(e) => onScrollBottom(complete, fileMessages)}
            >
              <IonInfiniteScrollContent>
                <IonLoading isOpen={fetchLoading} message={'fetching more media...'}/>
              </IonInfiniteScrollContent>
            </IonInfiniteScroll>
          </IonRow>
        </IonGrid>
      </IonContent>
    ) : (
      <IonContent className={styles["empty-media"]}>
        <IonIcon icon={sadOutline} />
        <IonText className="ion-padding ion-margin-bottom no-media-label">
            {intl.formatMessage({
              id: "app.groups.media.no-media",
            })}
        </IonText>
      </IonContent>
    )
  ) : (
    <IonLoading isOpen={loading} />
  );
};

export default Media;
