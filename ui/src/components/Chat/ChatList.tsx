import { IonText } from "@ionic/react";
import React from "react";
import { useIntl } from "react-intl";
import styles from "./style.module.css";
import { ChatListProps } from "./types";

const ChatList: React.FC<ChatListProps> = ({ children, type = "p2p" }) => {
  const arrChildren = React.Children.toArray(children);
  const intl = useIntl();
  const assess = (
    child: React.ReactElement,
    arrChildren: React.ReactElement[],
    i: number
  ) => {
    let showProfilePicture = false;
    let space = false;
    let showName = false;
    let showDate = i === 0;

    if (i === 0) showProfilePicture = true;

    const prevChild = arrChildren[i - 1];
    const props = child?.props;
    const prevChildProps = prevChild?.props;
    if (props?.author !== prevChildProps?.author) {
      showProfilePicture = true;
      space = true;
    }
    const timestamp: Date = props?.timestamp;
    const prevTimestamp: Date = prevChildProps?.timestamp;
    if (timestamp && prevTimestamp) {
      showDate = !(
        timestamp.getDate() === prevTimestamp.getDate() &&
        timestamp.getMonth() === prevTimestamp.getMonth() &&
        timestamp.getFullYear() === prevTimestamp.getFullYear()
      );
      if (showDate) showProfilePicture = true;
    }
    if (type === "group") showName = showProfilePicture;

    return { showProfilePicture, space, showName, showDate };
  };
  return (
    <div className={`${styles.chat} ion-padding`}>
      {React.Children.map(arrChildren, (child, i) => {
        if (React.isValidElement(child)) {
          const { showProfilePicture, showName, showDate } = assess(
            child,
            arrChildren as React.ReactElement[],
            i
          );
          return (
            <>
              {showDate ? (
                <IonText className="ion-text-center">
                  {intl.formatDate(child.props.timestamp, {
                    year: "numeric",
                    month: "numeric",
                    day: "numeric",
                  })}
                </IonText>
              ) : null}
              {React.cloneElement(child, {
                type,
                showProfilePicture,
                showName,
              })}
            </>
          );
        }
        return child;
      })}
    </div>
  );
};

export default ChatList;