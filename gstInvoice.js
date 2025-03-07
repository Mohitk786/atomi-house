const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();
const db = admin.firestore();


const GST_RATE = 0.18;

exports.generateGSTInvoice = functions.firestore
    .document("bookings/{bookingId}")
    .onUpdate(async (change, context) => {
        const beforeData = change.before.data();
        const afterData = change.after.data();

       
        if (beforeData.status !== "finished" && afterData.status === "finished") {
            try {
                const { name, totalAmount, state } = afterData;

                if (!totalAmount || totalAmount <= 0) {
                    console.error("Invalid booking amount.");
                    return;
                }

                const gstAmount = totalBookingAmount * GST_RATE;
                let igst = 0, cgst = 0, sgst = 0;
                
                if (state === "same") { 
                    cgst = gstAmount / 2;
                    sgst = gstAmount / 2;
                } else {  
                    igst = gstAmount;
                }
                
                
                // Prepare invoice data
                const invoiceData = {
                    name,
                    totalAmount,
                    gstAmount,
                    igst,
                    cgst,
                    sgst,
                    timestamp: admin.firestore.Timestamp.now(),
                };

             
                await db.collection("invoices").doc(context.params.bookingId).set(invoiceData);

                console.log("Invoice generated:", invoiceData);

                const response = await axios.post("https://api.example.com/gst-filing", invoiceData, {
                    headers: {
                        "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.GST_API_KEY}`
                    }
                });

                console.log("GST API Response:", response.data);

            } catch (error) {
                console.error("Error processing GST invoice:", error);
            }
        }
    });
