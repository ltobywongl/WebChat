import excuteQuery from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"

export default async function handler(req, res) {
    const { invId } = req.query
    const session = await getServerSession(req, res, authOptions)

    //Check for access
    let Access = false;
    if (!isNaN(invId) && session.user) {
        try {
            const result = await excuteQuery({
                query: 'SELECT COUNT(1) AS nums FROM invitation WHERE rec_userid = (?) AND id = (?);',
                values: [session.user.id, invId]
            });
            if (result && JSON.parse(JSON.stringify(result[0]))['nums'] === 1) Access = true;
        } catch (error) {
            console.log(error);
            res.status(500).json("Error")
        }
    }

    let roomId = 0;
    let alrInRoom = false;
    if (Access) {
        try {
            const roomQuery = await excuteQuery({
                query: 'SELECT roomid FROM invitation WHERE id = (?);',
                values: [invId]
            });
            roomId = roomQuery[0].roomid;
            const result = await excuteQuery({
                query: 'SELECT COUNT(1) AS nums FROM participant WHERE userid = (?) AND roomid = (?) LIMIT 1;',
                values: [session.user.id, roomId]
            });
            if (result && JSON.parse(JSON.stringify(result[0]))['nums'] === 1) alrInRoom = true;
        } catch (error) {
            console.log(error);
            res.status(500).json("User is already in room.")
        }
    }

    if (!alrInRoom) {
        try {
            if (result) {
                await excuteQuery({
                    query: 'DELETE FROM invitation WHERE id = (?);',
                    values: [invId]
                });
                await excuteQuery({
                    query: 'INSERT INTO participant (userid, roomid) VALUES ((?), (?));',
                    values: [session.user.id, roomId]
                });
            }
            res.status(200).json("Success")
        } catch (error) {
            console.log(error);
            res.status(500).json("Error")
        }
    } else {
        res.status(500).json("No Access!")
    }
}
