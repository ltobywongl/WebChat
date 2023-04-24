import excuteQuery from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"

export default async function handler(req, res) {
    const { roomId, messageBatch } = req.query
    const session = await getServerSession(req, res, authOptions)

    //Check for access
    let Access = false;
    if (session) {
        if (roomId == 1) {
            Access = true;
        } else {
            try {
                const result = await excuteQuery({
                    query: 'SELECT COUNT(1) AS nums FROM participant WHERE userid = (?) AND roomid = (?);',
                    values: [session.user.id, roomId]
                });
                if (result && JSON.parse(JSON.stringify(result[0]))['nums'] === 1) Access = true;
            } catch (error) {
                console.log(error);
                res.status(500).json([{}])
            }
        }
    }

    if (!isNaN(roomId) && !isNaN(messageBatch) && Access) {
        try {
            const result = await excuteQuery({
                query: 'SELECT * FROM message WHERE roomid = (?) ORDER BY time DESC LIMIT 20 OFFSET ?;',
                values: [parseInt(roomId), 20 * messageBatch]
            });
            res.status(200).json(result)
        } catch (error) {
            console.log(error);
            res.status(500).json([{}])
        }
    } else {
        var today = new Date();
        let HoursZ = today.getHours() >= 10 ? '' : '0';
        let MinutesZ = today.getMinutes() >= 10 ? '' : '0';
        let SecondsZ = today.getSeconds() >= 10 ? '' : '0';
        var time = today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate() + " " + HoursZ + today.getHours() + ":" + MinutesZ + today.getMinutes() + ":" + SecondsZ + today.getSeconds();
        res.status(500).json([{ username: "Server", image: "https://i.ibb.co/C90rDj5/chick-min.png", message: "You have no access to the room!", time: time }])
    }
}
