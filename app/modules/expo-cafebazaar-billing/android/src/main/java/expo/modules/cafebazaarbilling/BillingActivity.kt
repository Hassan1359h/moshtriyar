package expo.modules.cafebazaarbilling

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import ir.cafebazaar.poolakey.Payment
import ir.cafebazaar.poolakey.callback.PurchaseCallback
import ir.cafebazaar.poolakey.request.PurchaseRequest

/**
 * Transparent activity that runs the Poolakey purchase or subscribe flow
 * and returns the result via setResult.
 */
class BillingActivity : ComponentActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val productId = intent.getStringExtra(EXTRA_PRODUCT_ID) ?: run {
      setResult(RESULT_CANCELED, Intent().putExtra(EXTRA_ERROR, "Missing productId"))
      finish()
      return
    }
    val command = intent.getStringExtra(EXTRA_COMMAND) ?: COMMAND_PURCHASE
    val payload = intent.getStringExtra(EXTRA_PAYLOAD)
    val dynamicPriceToken = intent.getStringExtra(EXTRA_DYNAMIC_PRICE_TOKEN)
    val payment = CafeBazaarBillingModule.getCurrentPayment()
    if (payment == null) {
      setResult(RESULT_CANCELED, Intent().putExtra(EXTRA_ERROR, "Billing not connected"))
      finish()
      return
    }
    val request = PurchaseRequest(productId, payload, dynamicPriceToken)
    val callback: PurchaseCallback.() -> Unit = {
      purchaseSucceed { purchaseEntity ->
        setResult(RESULT_OK, Intent().putExtra(EXTRA_PURCHASE, purchaseEntity.originalJson))
        finish()
      }
      purchaseCanceled {
        setResult(RESULT_CANCELED, Intent().putExtra(EXTRA_ERROR, "Purchase canceled"))
        finish()
      }
      purchaseFailed { throwable ->
        setResult(RESULT_CANCELED, Intent().putExtra(EXTRA_ERROR, throwable.message ?: "Purchase failed"))
        finish()
      }
      purchaseFlowBegan { }
      failedToBeginFlow { throwable ->
        setResult(RESULT_CANCELED, Intent().putExtra(EXTRA_ERROR, throwable.message ?: "Failed to begin flow"))
        finish()
      }
    }
    when (command) {
      COMMAND_SUBSCRIBE -> payment.subscribeProduct(activityResultRegistry, request, callback)
      else -> payment.purchaseProduct(activityResultRegistry, request, callback)
    }
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
