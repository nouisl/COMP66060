import Orbis from "@orbisclub/orbis-sdk";

// init Orbis
const orbis = new Orbis();

// connect to wallet
const connectOrbis = async () => {
  try {
    let res = await orbis.connect_v2({ provider: window.ethereum });
    if (res.status === 200) {
      return res.did; // Return user DID or address
    } else {
      throw new Error("Orbis connection failed");
    }
  } catch (err) {
    console.error("Orbis connect error:", err);
    throw err;
  }
};

// store invite - encrypted
const sendInvite = async (email, docId, recipientDid) => {
  try {
    let res = await orbis.createPost({
      body: `Invitation to sign document ${docId}`,
      tags: [docId, "invite"],
      data: { email, docId, status: "pending" },
      encryptionRules: {
        type: "dids",
        dids: [recipientDid]
      }
    });
    if (res.status !== 200) throw new Error("Failed to send invite");
    return res;
  } catch (err) {
    console.error("Orbis sendInvite error:", err);
    throw err;
  }
};

// query invites for a user - decrypted emails
const getInvites = async (email) => {
  try {
    let res = await orbis.getPosts({ tag: "invite" });
    if (res.status !== 200) throw new Error("Failed to fetch invites");
    return res.data.filter(invite => invite.data && invite.data.email === email);
  } catch (err) {
    console.error("Orbis getInvites error:", err);
    throw err;
  }
};

// create or update user profile - encrypted
const setUserProfile = async (profile, recipientDid) => {
  try {
    let res = await orbis.createPost({
      body: "User profile",
      tags: ["profile"],
      data: profile,
      encryptionRules: {
        type: "dids",
        dids: [recipientDid]
      }
    });
    if (res.status !== 200) throw new Error("Failed to set user profile");
    return res;
  } catch (err) {
    console.error("Orbis setUserProfile error:", err);
    throw err;
  }
};

// get user profile - decrypted by email
const getUserProfile = async (email) => {
  try {
    let res = await orbis.getPosts({ tag: "profile" });
    if (res.status !== 200) throw new Error("Failed to fetch profiles");
    return res.data.find(post => post.data && post.data.email === email);
  } catch (err) {
    console.error("Orbis getUserProfile error:", err);
    throw err;
  }
};

// accept invite
const acceptInvite = async (inviteId) => {
  try {
    let res = await orbis.updatePost({
      stream_id: inviteId,
      data: { status: "accepted" }
    });
    if (res.status !== 200) throw new Error("Failed to accept invite");
    return res;
  } catch (err) {
    console.error("Orbis acceptInvite error:", err);
    throw err;
  }
};

export { connectOrbis, sendInvite, getInvites, setUserProfile, getUserProfile, acceptInvite };