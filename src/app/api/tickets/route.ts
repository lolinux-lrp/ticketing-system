import { NextResponse } from "next/server"
import {prisma} from "@/lib/prisma"

export async function POST(req: Request){
    try{

        const body = await req.json();
        const {createdById,description,title} = body;

        if(!createdById || !description || !title){
            return NextResponse.json({error: "All fields necessary for making a ticket"},{status: 400});
        }
        
        const newTicket = await prisma.ticket.create({
            data:{
                createdById,
                description,
                title
            }
        });

        return NextResponse.json(newTicket,{status: 201});
    }catch{
        return NextResponse.json({error: "Failed to create ticket"}, {status: 500})
    }
}

export async function GET(){
    try{
        const tickets = await prisma.ticket.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(tickets,{status: 200});
    }catch(error){
        console.log("Error fetching tickets:", error)
        return NextResponse.json({error: "Failed to fetch tickets"}, {status: 500})
    }
}