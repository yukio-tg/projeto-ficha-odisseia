const { initializeApp } = require('firebase/app');
const { getAuth, getUserByEmail } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBQ0uqkmCUDV8QRdm-ID_jwiYvTgrI3U5U",
  authDomain: "odisseia-ascalon.firebaseapp.com",
  projectId: "odisseia-ascalon",
  storageBucket: "odisseia-ascalon.firebasestorage.app",
  messagingSenderId: "846959903896",
  appId: "1:846959903896:web:f90aeafa15b1073e5a7ced"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createAdminUser() {
  try {
    console.log('Buscando usuário dantagata2018@gmail.com...');
    
    // Busca o usuário pelo email
    const userRecord = await getUserByEmail(auth, 'dantagata2018@gmail.com');
    console.log('Usuário encontrado! UID:', userRecord.uid);
    
    // Cria o documento na coleção usuarios com role admin
    await setDoc(doc(db, 'usuarios', userRecord.uid), {
      role: 'admin',
      email: 'dantagata2018@gmail.com',
      createdAt: new Date()
    });
    
    console.log('✅ Usuário admin criado com sucesso!');
    console.log('UID:', userRecord.uid);
    console.log('Email: dantagata2018@gmail.com');
    console.log('Role: admin');
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário admin:', error);
    if (error.code === 'auth/user-not-found') {
      console.log('❌ Usuário não encontrado no Firebase Auth. Verifique se o email está correto.');
    }
  }
}

createAdminUser();
