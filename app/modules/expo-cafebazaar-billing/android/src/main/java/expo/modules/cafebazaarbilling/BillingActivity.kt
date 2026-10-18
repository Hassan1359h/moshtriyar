
package expo.modules.cafebazaarbilling

import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import ir.cafebazaar.poolakey.callback.PurchaseCallback
import ir.cafebazaar.poolakey.request.PurchaseRequest

class BillingActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val productId = intent.getStringExtra(EXTRA_PRODUCT_ID) ?: run {
            finishWithError("Missing productId")
            return
        }

        val command = intent.getStringExtra(EXTRA_COMMAND)
            ?: COMMAND_PURCHASE

        val payload = intent.getStringExtra(EXTRA_PAYLOAD)

        val dynamicPriceToken =
            intent.getStringExtra(EXTRA_DYNAMIC_PRICE_TOKEN)

        val payment = CafeBazaarBillingModule.getCurrentPayment()

        if (payment == null) {
            finishWithError("Billing not connected")
            return
        }

        val request = PurchaseRequest(
            productId,
            payload,
            dynamicPriceToken
        )

        val callback: PurchaseCallback.() -> Unit = {

            purchaseSucceed { purchaseEntity ->
                setResult(
                    RESULT_OK,
                    Intent().putExtra(
                        EXTRA_PURCHASE,
                        purchaseEntity.originalJson
                    )
                )
                finish()
            }

            purchaseCanceled {
                finishWithError("PURCHASE_CANCELED")
            }

            purchaseFailed { throwable ->
                Log.e(
                    "MoshtriyarBilling",
                    "Purchase failed",
                    throwable
                )

                finishWithError(
                    "PURCHASE_FAILED: " +
                        throwable.javaClass.simpleName +
                        ": " +
                        (throwable.message ?: "Unknown error")
                )
            }

            purchaseFlowBegan {
                Log.d(
                    "MoshtriyarBilling",
                    "Purchase flow began"
                )
            }

            failedToBeginFlow { throwable ->
                Log.e(
                    "MoshtriyarBilling",
                    "Failed to begin purchase flow",
                    throwable
                )

                finishWithError(
                    "FLOW_FAILED: " +
                        throwable.javaClass.simpleName +
                        ": " +
                        (throwable.message ?: "Unknown error")
                )
            }
        }

        try {
            when (command) {
                COMMAND_SUBSCRIBE -> {
                    payment.subscribeProduct(
                        activityResultRegistry,
                        request,
                        callback
                    )
                }

                else -> {
                    payment.purchaseProduct(
                        activityResultRegistry,
                        request,
                        callback
                    )
                }
            }
        } catch (e: Exception) {
            Log.e(
                "MoshtriyarBilling",
                "Billing launch exception",
                e
            )

            finishWithError(
                "BILLING_EXCEPTION: " +
                    e.javaClass.simpleName +
                    ": " +
                    (e.message ?: "Unknown error")
            )
        }
    }

    private fun finishWithError(message: String) {
        setResult(
            RESULT_CANCELED,
            Intent().putExtra(EXTRA_ERROR, message)
        )
        finish()
    }

    companion object {
        const val EXTRA_PRODUCT_ID = "productId"
        const val EXTRA_COMMAND = "command"
        const val EXTRA_PAYLOAD = "payload"
        const val EXTRA_DYNAMIC_PRICE_TOKEN = "dynamicPriceToken"

        const val EXTRA_PURCHASE = "purchase"
        const val EXTRA_ERROR = "error"

        const val COMMAND_PURCHASE = "purchase"
        const val COMMAND_SUBSCRIBE = "subscribe"
    }
}
