import {
  FUNCTIONS,
  ZOMES,
} from "../../../utils/services/HolochainService/types";
import { pushError } from "../../error/actions";
import { AgentProfile, Profile } from "../../profile/types";
import { ThunkAction } from "../../types";
import { ContactOutput, SET_BLOCKED } from "../types";

const fetchBlocked =
  (): ThunkAction =>
  async (dispatch, _, { callZome }) => {
    try {
      const contactOutputs: ContactOutput[] = await callZome({
        zomeName: ZOMES.CONTACTS,
        fnName: FUNCTIONS[ZOMES.CONTACTS].LIST_BLOCKED,
      });
      const idsB64 = contactOutputs.map((contact) => contact.id);

      let blocked: { [key: string]: Profile } = {};
      try {
        const profilesOutput = await callZome({
          zomeName: ZOMES.PROFILES,
          fnName: FUNCTIONS[ZOMES.PROFILES].GET_AGENTS_PROFILES,
          payload: idsB64,
        });

        profilesOutput.forEach((agentProfile: AgentProfile) => {
          const id = agentProfile.agentPubKey;
          blocked[id] = {
            id,
            username: agentProfile.profile.nickname,
            fields: agentProfile.profile.fields.avatar
              ? { avatar: agentProfile.profile.fields.avatar }
              : {},
          };
        });
        dispatch({
          type: SET_BLOCKED,
          blocked,
        });
        return blocked;
      } catch (e) {
        if (
          (e as any).message.includes(
            "Failed to get the username for this agent"
          )
        )
          dispatch(
            pushError("TOAST", {}, { id: "redux.err.contacts.fetch-blocked.1" })
          );
        else if (
          (e as any).message.includes("No username for this agent exists")
        )
          dispatch(
            pushError("TOAST", {}, { id: "redux.err.contacts.fetch-blocked.2" })
          );
        else dispatch(pushError("TOAST", {}, { id: "redux.err.generic" }));
      }
    } catch (e) {
      dispatch(pushError("TOAST", {}, { id: "redux.err.generic" }));
    }
    return null;
  };

export default fetchBlocked;
