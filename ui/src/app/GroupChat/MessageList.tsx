import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { RootState } from "../../redux/types";
import { GroupMessage, GroupMessagesContents, GroupMessagesOutput } from "../../redux/group/types";
import Chat from "../../components/Chat";
import { ChatListMethods } from "../../components/Chat/types";
import { base64ToUint8Array, useAppDispatch } from "../../utils/helpers";
import { getNextBatchGroupMessages } from "../../redux/group/actions";
import { IonLoading } from "@ionic/react";
interface Props {
  messageIds: string[];
  members: string[];
  myAgentId: string;
  groupId: string;
  // TODO: not really sure what type this is
  chatList: React.RefObject<ChatListMethods>;
}
const MessageList: React.FC<Props> = ({
  messageIds,
  members,
  myAgentId,
  chatList,
  groupId,
}) => {
  const dispatch = useAppDispatch();

  // LOCAL STATE
  const [messages, setMessages] = useState<any[]>([]);
  const [oldestFetched, setOldestFetched] = useState<boolean>(false);
  const [oldestMessage, setOldestMessage] = useState<any>();
  const [loading, setLoading] = useState<boolean>(false);

  const allMembers = useSelector((state: RootState) => state.groups.members);
  const username = useSelector((state: RootState) => state.profile.username);
  const messagesData = useSelector((state: RootState) => {
    let uniqueArray = messageIds.filter(function (item, pos, self) {
      return self.indexOf(item) === pos;
    });
    const messages: (any | undefined)[] = uniqueArray
      ? uniqueArray.map((messageId) => {
          let message: GroupMessage = state.groups.messages[messageId];

          if (message) {
            const authorProfile = allMembers[message.author];
            return {
              ...message,
              author: authorProfile
                ? authorProfile
                : // if profile was not found from allMembers, then the author is self
                  // assuming that allMembers have all the members of group at all times
                  {
                    username: username!,
                    id: message.author,
                  },
            };
          }
          return null;
        })
      : [];

    // TODO: handle fetching of missing messages (most likely won't occur)
    if (messages.find((message) => message === null)) return null;
    messages.sort((x, y) => {
      return x.timestamp.valueOf()[0] - y.timestamp.valueOf()[0];
    });
    return messages;
  });

  const handleOnScrollTop = (complete: any) => {
    setLoading(true);
    if (messagesData?.length) {
      let lastMessage = messagesData![0];
      console.log("here is the last message", oldestMessage)
      dispatch(
        getNextBatchGroupMessages({
          groupId: base64ToUint8Array(groupId),
          // the entry hash of the last message in the last batch fetched
          lastFetched: oldestMessage ? base64ToUint8Array(oldestMessage.groupMessageEntryHash) : base64ToUint8Array(lastMessage.groupMessageEntryHash),
          // 0 - seconds since epoch, 1 - nanoseconds. See Timestamp type in hdk doc for more info.
          lastMessageTimestamp: lastMessage.timestamp,
          batchSize: 10,
          payloadType: { type: "ALL", payload: null }
        })
      ).then((res: GroupMessagesOutput) => {
        if (Object.keys(res.groupMessagesContents).length !== 0) {
          let groupMesssageContents: GroupMessagesContents = res.groupMessagesContents;
          console.log("here are the new messages", res)
          const fetchedMessages: (any | undefined)[] = [];
          Object.keys(groupMesssageContents).forEach((key: any) => {
            const authorProfile = allMembers[groupMesssageContents[key].author];
            fetchedMessages.push({
              ...groupMesssageContents[key],
              author: authorProfile
                ? authorProfile
                : // if profile was not found from allMembers, then the author is self
                  // assuming that allMembers have all the members of group at all times
                  {
                    username: username!,
                    id: groupMesssageContents[key].author,
                  },
            });
          });
          let newMessages = [...messages, ...fetchedMessages]
          newMessages.sort((x, y) => {
            return x.timestamp.valueOf()[0] - y.timestamp.valueOf()[0];
          });
          let newOldestMessage = res.groupMessagesContents[res.messagesByGroup[groupId][res.messagesByGroup[groupId].length - 1]]
          setOldestMessage(newOldestMessage);
          setMessages(newMessages);
          setLoading(false);
        } else {
          setOldestFetched(true);
          setLoading(false);
        }
      })
    }


    complete()
    return null;
  };

  useEffect(() => {
    setMessages(messagesData!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageIds])

  return (
    <>
    <IonLoading isOpen={loading} message="Fetching more" />
      <Chat.ChatList
        disabled={oldestFetched}
        onScrollTop={(complete) => handleOnScrollTop(complete)}
        ref={chatList}
        type="group"
      >
        {messages!.map((message, i) => {
          if (message.author.id === myAgentId)
            return (
              <Chat.Me
                key={message.groupMessageEntryHash}
                author={message.author.username}
                timestamp={new Date(message.timestamp[0] * 1000)}
                payload={message.payload}
                readList={message.readList}
                type="group"
                showName={true}
                showProfilePicture={true}
              />
            );
          return (
            <Chat.Others
              key={message.groupMessageEntryHash}
              author={message.author.username}
              timestamp={new Date(message.timestamp[0] * 1000)}
              payload={message.payload}
              readList={message.readList}
              type="group"
              showName={true}
              onSeen={(complete) => {
                if (i === messagesData!.length - 1) {
                  complete();
                }
              }}
              showProfilePicture={true}
            />
          );
        })}
      </Chat.ChatList>
    </>
  );
};

export default MessageList;
