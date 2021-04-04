import { IonItem } from "@ionic/react";
  import React from "react";
import { FilePayload } from "../../../../../redux/commons/types";
import ImageView from "../../../../../components/Chat/File/ImageView/index";
  
  interface Props {
    file?: FilePayload;
  }
  
  const MediaItem: React.FC<Props> = ({ file }) => {
    // const [selectedItem, setSelectedItem] = useState<boolean>(false);
    const decoder = new TextDecoder();

    const renderFile = () => {
        switch (file?.fileType) {
          case "IMAGE":
            return (
              <ImageView file={file} src={decoder.decode(file.thumbnail!)} />
            );
          case "OTHER":
            return null;
            // TODO: work on video
          default:
            return null;
        }
      };
  
    // const handleOnClick = () => {
    //   let selected = onCompletion(contact);
    //   if (selected) setSelectedItem(selectedItem ? false : true);
    // };
  
    return (
      <IonItem button　lines="none" key={JSON.stringify(file?.fileHash)} >
          {renderFile()}
      </IonItem>
    );
  };
  
  export default MediaItem;
  