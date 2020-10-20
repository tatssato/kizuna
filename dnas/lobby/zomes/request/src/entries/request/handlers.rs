use super::{CapFor, Payload, Claims};
use hdk3::prelude::*;

pub(crate) fn init(_: ()) -> ExternResult<InitCallbackResult> {
    let mut functions: GrantedFunctions = HashSet::new();
    functions.insert((zome_info!()?.zome_name, "accept_cap_claim".into()));

    let mut x: GrantedFunctions = HashSet::new();
    x.insert((zome_info!()?.zome_name, "receive_request".into()));

    create_cap_grant!(CapGrantEntry {
        tag: "".into(),
        access: ().into(),
        functions,
    })?;
    create_cap_grant!(CapGrantEntry {
        tag: "".into(),
        access: ().into(),
        functions: x,
    })?;

    Ok(InitCallbackResult::Pass)
}

pub(crate) fn accept_cap_claim(claim: CapClaim) -> ExternResult<HeaderHash> {
    Ok(create_cap_claim!(claim)?)
}

pub(crate) fn get_cap_claims(_: ()) -> ExternResult<Claims> {
    let query_result = query!(
        QueryFilter::new()
        .entry_type(EntryType::CapClaim)
        .include_entries(true)
    )?;

    let result: Vec<CapClaim> = query_result
        .0
        .into_iter()
        .filter_map(|e| 
            match e.header() {
                Header::Create(_create) => Some(e.clone().into_inner().1.into_option().unwrap().as_cap_claim().unwrap().to_owned()),
                _ => None,
            })
        .collect();

    Ok(Claims(result))
}

pub(crate) fn send_message(cap_for: CapFor) -> ExternResult<Payload> {
    match call_remote!(
        cap_for.agent_pub_key,
        zome_info!()?.zome_name,
        "needs_cap_claim".to_string().into(),
        Some(cap_for.cap_secret),
        ().try_into()?
    )? {
        ZomeCallResponse::Ok(payload) => Ok(payload.into_inner().try_into()?),
        ZomeCallResponse::Unauthorized => Err(HdkError::Wasm(WasmError::Zome(
            "{\"code\": \"000\", \"message\": \"[Unauthorized] Accept Request\"}".to_owned(),
        )))
    }
}

pub(crate) fn receive_request(agent: AgentPubKey) -> ExternResult<()> {
    let tag = String::from("has_cap_claim");
    let secret = generate_cap_secret!()?;
    let mut functions: GrantedFunctions = HashSet::new();
    let this_zome = zome_info!()?.zome_name;
    
    functions.insert((this_zome.clone(), "needs_cap_claim".into()));

    create_cap_grant!(CapGrantEntry {
        access: (secret, agent.clone()).into(),
        functions,
        tag: tag.clone(),
    })?;

    call_remote!(
        agent,
        this_zome,
        "accept_cap_claim".into(),
        None,
        CapClaim::new(tag, agent_info!()?.agent_latest_pubkey, secret).try_into()?
    )?;

    Ok(())
}
