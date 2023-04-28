import excuteQuery from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"

export default async function handler(req, res) {
    const { roomId, email } = req.query
    const session = await getServerSession(req, res, authOptions)

    //Check for access
    let Access = false;
    var filter = /^[a-zA-Z0-9_.-]+@[a-zA-Z0-9]+[a-zA-Z0-9.-]+[a-zA-Z0-9]+\.[a-z]{1,4}$/;
    if (!isNaN(roomId) && filter.test(email) && session.user) {
        try {
            const result = await excuteQuery({
                query: 'SELECT COUNT(1) AS nums FROM participant WHERE userid = (?) AND roomid = (?);',
                values: [session.user.id, roomId]
            });
            if (result && JSON.parse(JSON.stringify(result[0]))['nums'] === 1) Access = true;
        } catch (error) {
            console.log(error);
            res.status(500).json("No Access!")
        }
    }

    let registered = false;
    if (Access) {
        try {
            const result = await excuteQuery({
                query: 'SELECT COUNT(1) AS nums, id FROM user WHERE email = (?) GROUP BY id LIMIT 1;',
                values: [email]
            });
            if (result && JSON.parse(JSON.stringify(result[0]))['nums'] === 1) registered = JSON.parse(JSON.stringify(result[0]))['id'];
        } catch (error) {
            console.log(error);
            res.status(500).json("User not registered.")
        }
    } else {
        res.status(500).json("No Access!")
    }

    let alrInRoom = false;
    let invited = false;
    if (registered && typeof registered === "string") {
        try {
            const result = await excuteQuery({
                query: 'SELECT COUNT(1) AS nums FROM participant WHERE userid = (?) AND roomid = (?) LIMIT 1;',
                values: [registered, roomId]
            });
            if (result && JSON.parse(JSON.stringify(result[0]))['nums'] === 1) alrInRoom = true;
        } catch (error) {
            console.log(error);
            res.status(500).json("User is already in room.")
        }
        try {
            const result = await excuteQuery({
                query: 'SELECT COUNT(1) AS nums FROM invitation WHERE rec_userid = (?) AND roomid = (?) LIMIT 1;',
                values: [registered, roomId]
            });
            if (result && JSON.parse(JSON.stringify(result[0]))['nums'] === 1) invited = true;
        } catch (error) {
            console.log(error);
            res.status(500).json("User is already in room.")
        }
    } else {
        res.status(500).json("User is not registered.")
    }

    if (!alrInRoom && !invited) {
        try {
            await excuteQuery({
                query: 'INSERT INTO invitation (roomid, inv_userid, rec_userid) VALUES ((?), (?), (?));',
                values: [roomId, session.user.id, registered]
            });
            res.status(200).json("Invitation sent.")
        } catch (error) {
            console.log(error);
            res.status(500).json("Failed to send invitation.")
        }
    } else {
        if (invited) res.status(500).json("User is already invited to room.")
        if (alrInRoom) res.status(500).json("User is already in room.")
    }
}
