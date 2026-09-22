import nodemailer from "nodemailer";

const transporter =
  nodemailer.createTransport({
    service: "gmail",

    auth: {
      user:
        process.env.GMAIL_USER,

      pass:
        process.env.GMAIL_APP_PASSWORD,
    },
  });

const sendSubscriptionEmail =
  async ({
    email,
    name,
    planName,
    billingCycle,
    amount,
    currency,
    paymentId,
    orderId,
    invoiceNumber,
    startDate,
    expiryDate,
  }) => {
    if (
      !process.env.GMAIL_USER ||
      !process.env.GMAIL_APP_PASSWORD
    ) {
      console.log(
        "Email credentials are not configured. Subscription email skipped."
      );

      return;
    }

    const formattedStart =
      new Date(
        startDate
      ).toLocaleDateString(
        "en-IN"
      );

    const formattedExpiry =
      new Date(
        expiryDate
      ).toLocaleDateString(
        "en-IN"
      );

    const mailOptions = {
      from:
        `"YouTube 2.0" <${process.env.GMAIL_USER}>`,

      to: email,

      subject:
        `Subscription Activated - ${planName}`,

      html: `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 700px;
          margin: auto;
          padding: 30px;
          border: 1px solid #ddd;
          border-radius: 12px;
        ">

          <h1 style="margin-bottom: 5px;">
            Subscription Confirmed
          </h1>

          <p>
            Hello ${
              name || "User"
            },
          </p>

          <p>
            Your YouTube 2.0 subscription
            has been successfully activated.
          </p>

          <hr />

          <h2>
            Subscription Details
          </h2>

          <p>
            <strong>Plan:</strong>
            ${planName}
          </p>

          <p>
            <strong>Billing Cycle:</strong>
            ${billingCycle}
          </p>

          <p>
            <strong>Amount:</strong>
            ${currency} ${amount}
          </p>

          <p>
            <strong>Start Date:</strong>
            ${formattedStart}
          </p>

          <p>
            <strong>Expiry Date:</strong>
            ${formattedExpiry}
          </p>

          <hr />

          <h2>
            Payment Details
          </h2>

          <p>
            <strong>Payment ID:</strong>
            ${paymentId}
          </p>

          <p>
            <strong>Order ID:</strong>
            ${orderId}
          </p>

          <p>
            <strong>Invoice Number:</strong>
            ${invoiceNumber}
          </p>

          <hr />

          <p>
            Your premium features are now
            available according to your selected
            subscription plan.
          </p>

          <p>
            If you have any questions regarding
            your payment or subscription, please
            contact our support team.
          </p>

          <p>
            Regards,<br />
            <strong>YouTube 2.0 Team</strong>
          </p>

        </div>
      `,
    };

    await transporter.sendMail(
      mailOptions
    );

    console.log(
      `Subscription confirmation email sent to ${email}`
    );
  };

export default
  sendSubscriptionEmail;