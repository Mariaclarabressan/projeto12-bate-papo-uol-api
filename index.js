import express, { json } from 'express';
import dotenv from 'dotenv';
import joi from 'joi';
import { MongoClient } from 'mongodb';
import cors from 'cors';
import dayjs from 'dayjs';


dotenv.config();

const servidor = express();
servidor.use(cors());
servidor.use(json());


const conexao_mongo = new MongoClient(process.env.CONEXAO_MONGO);
let db;
conexao_mongo.connect().then(() => {
    db = conexao_mongo.db("api_bate_papo_UOL");
  });



servidor.post('/participants', async (req, res) => {
    const nome = req.body;

    const nomeUsuario = joi.object({
        name: joi.string().required()
    });

    const confereNome = nomeUsuario.validate(req.body);

    if (confereNome.error) {
        return res.status(422).send();
    }

    try {
        let usuario = await db.collection('usuarios').findOne({ name: req.body.name }).toArray();
        if (usuario) {
            res.status(409).send();
            console.log("Nome em uso, escolha outro.")
            return;
        }
        await db.collection('usuarios')
            .insertOne({ ...nome, lastStatus: Date.now() });
        await db.collection('mensagens')
            .insertOne({ from: nome.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format('HH:MM:SS') })


        res.status(201).send();
    }
    catch (error) {
        console.error(error);
        res.status(500).send();
    }

});

servidor.get("/participants", async (req, res) => {
    try {
        const usuarios = await db.collection('usuarios').find().toArray();
        res.send(usuarios)
    } catch {
        res.status(500).send();
    }
});

servidor.post('/messages', async (req, res) => {
    const body = req.body;
    const { user } = req.headers

    const mensagensUsuarios = joi.object({
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.string().valid('message', 'private_message').required()
    });

    const confereMensagem = mensagensUsuarios.validate(req.body);

    if (confereMensagem.error) {
        return res.status(422).send();
    }

    try {
        const confereParticipante = await db.collection('usuarios').findOne({ name: user });
        if (!confereParticipante) {
            return res.status(422).send();
        }
        await db.collection('mensagens').insertOne({ from: req.headers, to: body.to.text, type: body.type, time: dayjs().format('HH:MM:ss') });
        res.status(201).send();
    }
    catch (error) {
        console.error(error);
        res.status(500).send();
    }

});

servidor.get("/messages", async (req, res) => {
    const limit = req.query.limit
    const {user} = red.headers;

    try { 
        const mensagemDoUsuario = await db.collection('mensagens').find().toArray();
        const filtraMensagem = mensagemDoUsuario.length;
        if(limit && limit<filtraMensagem){
            const mensagens = await db.collection('mensagens').find({
                $or: [
                    {to: 'Todos'},
                    {from: user},
                    {to: user},
                    {type: 'message'}
                ]
            }).skip(filtraMensagem - parseInit((limit)).toArray());
            res.send(mensagens)
        }else {
            const mensagens = await db.collection('mensagens').find({
                $or:[
                    {to: 'Todos'},
                    {from: user},
                    {to: user},
                    {type: 'message'} 
                ]
            }).toArray();
            res.send(mensagens)
        }
    }
    catch{
        res.status(500).send()
    }
});

servidor.post("/status", async (res, req) => {
    const user = req.user.headers;

    try{
        const usuario = await db.collection('usuarios').find({name:user});
        if(!usuario){
            return res.status(404).send();
        }

        await db.collection('usuarios').updateOne(
            {name: user},
            {$set: {lastStatus: Date.now()}});
            res.status(200).send();
    
    }
    catch (error) {
        console.error(error);
        res.status(500).send();
    }
});




const PORTA = process.env.PORTA || 5011;


servidor.listen(PORTA, () => {
    console.log("Entrou no servidor.")
})
