package expo.modules.cafebazaarbilling

import android.content.Intent
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.Promise
import expo.modules.kotlin.activityresult.AppContextActivityResultContract
import expo.modules.kotlin.activityresult.AppContextActivityResultFallbackCallback
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import ir.cafebazaar.poolakey.Connection
import ir.cafebazaar.poolakey.ConnectionState
import ir.cafebazaar.poolakey.Payment
import ir.cafebazaar.poolakey.config.PaymentConfiguration
import ir.cafebazaar.poolakey.config.SecurityCheck
import org.json.JSONArray
import org.json.JSONObject
import java.io.Serializable

/** Input for the purchase/subscribe activity. */
private data class PurchaseInput(
  val productId: String,
  val command: String,
  val payload: String?,
  val dynamicPriceToken: String?
) : Serializable

/** Result from BillingActivity: purchase JSON string on success, error message on failure. */
private sealed class BillingResult : Serializable {
  data class Success(val purchaseJson: String) : BillingResult()
  data class Failure(val message: String) : BillingResult()
}

/** Contract to start BillingActivity and get purchase result or error. */
private class BillingActivityContract : AppContextActivityResultContract<PurchaseInput, BillingResult?> {
  override fun createIntent(context: android.content.Context, input: PurchaseInput): Intent {
    return Intent(context, BillingActivity::class.java).apply {
      putExtra(BillingActivity.EXTRA_PRODUCT_ID, input.productId)
      putExtra(BillingActivity.EXTRA_COMMAND, input.command)
      input.payload?.let { putExtra(BillingActivity.EXTRA_PAYLOAD, it) }
      input.dynamicPriceToken?.let { putExtra(BillingActivity.EXTRA_DYNAMIC_PRICE_TOKEN, it) }
    }
  }

  override fun parseResult(input: PurchaseInput, resultCode: Int, intent: Intent?): BillingResult? {
    if (resultCode == android.app.Activity.RESULT_OK && intent != null) {
      val json = intent.getStringExtra(BillingActivity.EXTRA_PURCHASE)
      if (json != null) return BillingResult.Success(json)
    }
    val error = intent?.getStringExtra(BillingActivity.EXTRA_ERROR) ?: "Unknown error"
    return BillingResult.Failure(error)
  }
}

/** Convert JSON string to Map for the bridge. */
private fun jsonStringToMap(json: String): Map<String, Any?> {
  val obj = JSONObject(json)
  val map = mutableMapOf<String, Any?>()
  for (key in obj.keys()) {
    map[key] = when (val v = obj.get(key)) {
      is JSONObject -> jsonObjectToMap(v)
      is JSONArray -> jsonArrayToList(v)
      else -> v
    }
  }
  return map
}

private fun jsonObjectToMap(obj: JSONObject): Map<String, Any?> {
  val map = mutableMapOf<String, Any?>()
  for (key in obj.keys()) {
    map[key] = when (val v = obj.get(key)) {
      is JSONObject -> jsonObjectToMap(v)
      is JSONArray -> jsonArrayToList(v)
      else -> v
    }
  }
  return map
}

private fun jsonArrayToList(arr: JSONArray): List<Any?> {
  return (0 until arr.length()).map { i ->
    when (val v = arr.get(i)) {
      is JSONObject -> jsonObjectToMap(v)
      is JSONArray -> jsonArrayToList(v)
      else -> v
    }
  }
}

/** Convert list of PurchaseInfo.originalJson to list of maps. */
private fun purchaseJsonListToMaps(jsonArray: String): List<Map<String, Any?>> {
  if (jsonArray.isBlank()) return emptyList()
  val arr = JSONArray(jsonArray)
  return (0 until arr.length()).map { i -> jsonObjectToMap(arr.getJSONObject(i)) }
}

/** Convert list of SkuDetails to list of maps (sku, type, price, title, description). */
private fun skuDetailsListToMaps(jsonArray: String): List<Map<String, Any?>> {
  if (jsonArray.isBlank()) return emptyList()
  val arr = JSONArray(jsonArray)
  return (0 until arr.length()).map { i -> jsonObjectToMap(arr.getJSONObject(i)) }
}

/**
 * Cafe Bazaar In-App Billing for Expo (Android).
 * Uses the official Poolakey SDK (com.github.cafebazaar.Poolakey:poolakey).
 * @see https://developers.cafebazaar.ir/fa/guidelines/in-app-billing/intro
 */
class CafeBazaarBillingModule : Module() {

  private var paymentConnection: Connection? = null
  private var payment: Payment? = null
  private var billingLauncher: expo.modules.kotlin.activityresult.AppContextActivityResultLauncher<PurchaseInput, BillingResult?>? = null

  override fun definition() = ModuleDefinition {
    Name("CafeBazaarBilling")

    RegisterActivityContracts {
      billingLauncher = registerForActivityResult(
        BillingActivityContract(),
        AppContextActivityResultFallbackCallback { _, _ -> }
      )
    }

    AsyncFunction("connect") { options: Map<String, Any>?, promise: Promise ->
      val rsaKey = options?.get("rsaPublicKey") as? String
      val securityCheck = if (rsaKey.isNullOrBlank()) {
        SecurityCheck.Disable
      } else {
        SecurityCheck.Enable(rsaPublicKey = rsaKey)
      }
      val config = PaymentConfiguration(localSecurityCheck = securityCheck)
      val ctx = appContext.reactContext ?: run {
        promise.reject("ERR_CONTEXT", "React context not available", null)
        return@AsyncFunction
      }
      val paymentInstance = Payment(context = ctx, config = config)
      payment = paymentInstance
      CafeBazaarBillingModule.setCurrentPayment(paymentInstance)
      var connectPromiseSettled = false
      fun settleConnectOnce(reject: Boolean, code: String, msg: String, e: Throwable?) {
        if (connectPromiseSettled) return
        connectPromiseSettled = true
        if (reject) promise.reject(code, msg, e) else promise.resolve(null)
      }
      paymentInstance.connect {
        connectionSucceed {
          settleConnectOnce(false, "", "", null)
        }
        connectionFailed {
          CafeBazaarBillingModule.setCurrentPayment(null)
          this@CafeBazaarBillingModule.payment = null
          settleConnectOnce(true, "ERR_CONNECT", it.message ?: "Connection failed", it)
        }
        disconnected {
          CafeBazaarBillingModule.setCurrentPayment(null)
          this@CafeBazaarBillingModule.payment = null
          paymentConnection = null
          // Do not settle connect promise here: it was already resolved in connectionSucceed.
        }
      }.also { paymentConnection = it }
    }

    AsyncFunction("disconnect") { promise: Promise ->
      paymentConnection?.disconnect()
      paymentConnection = null
      payment = null
      CafeBazaarBillingModule.setCurrentPayment(null)
      promise.resolve(null)
    }

    AsyncFunction("purchaseProduct") { productId: String, options: Map<String, Any>?, promise: Promise ->
      val payload = options?.get("developerPayload") as? String
      val dynamicPriceToken = options?.get("dynamicPriceToken") as? String
      if (paymentConnection?.getState() != ConnectionState.Connected) {
        promise.reject("ERR_NOT_CONNECTED", "Call connect() first", null)
        return@AsyncFunction
      }
      if (appContext.currentActivity == null) {
        promise.reject("ERR_NO_ACTIVITY", "Activity not available", null)
        return@AsyncFunction
      }
      val launcher = billingLauncher
      if (launcher == null) {
        promise.reject("ERR_LAUNCHER", "Billing launcher not ready", null)
        return@AsyncFunction
      }
      Handler(Looper.getMainLooper()).post {
        launcher.launch(
          PurchaseInput(
            productId = productId,
            command = BillingActivity.COMMAND_PURCHASE,
            payload = payload,
            dynamicPriceToken = dynamicPriceToken
          )
        ) { result ->
          when (result) {
            is BillingResult.Success -> {
              try {
                promise.resolve(jsonStringToMap(result.purchaseJson))
              } catch (e: Exception) {
                promise.reject("ERR_PARSE", "Failed to parse purchase", e)
              }
            }
            is BillingResult.Failure -> promise.reject("ERR_PURCHASE", result.message, null)
            null -> promise.reject("ERR_PURCHASE", "Purchase was canceled or failed", null)
          }
        }
      }
    }

    AsyncFunction("subscribeProduct") { productId: String, options: Map<String, Any>?, promise: Promise ->
      val payload = options?.get("developerPayload") as? String
      val dynamicPriceToken = options?.get("dynamicPriceToken") as? String
      if (paymentConnection?.getState() != ConnectionState.Connected) {
        promise.reject("ERR_NOT_CONNECTED", "Call connect() first", null)
        return@AsyncFunction
      }
      if (appContext.currentActivity == null) {
        promise.reject("ERR_NO_ACTIVITY", "Activity not available", null)
        return@AsyncFunction
      }
      val launcher = billingLauncher
      if (launcher == null) {
        promise.reject("ERR_LAUNCHER", "Billing launcher not ready", null)
        return@AsyncFunction
      }
      Handler(Looper.getMainLooper()).post {
        launcher.launch(
          PurchaseInput(
            productId = productId,
            command = BillingActivity.COMMAND_SUBSCRIBE,
            payload = payload,
            dynamicPriceToken = dynamicPriceToken
          )
        ) { result ->
          when (result) {
            is BillingResult.Success -> {
              try {
                promise.resolve(jsonStringToMap(result.purchaseJson))
              } catch (e: Exception) {
                promise.reject("ERR_PARSE", "Failed to parse purchase", e)
              }
            }
            is BillingResult.Failure -> promise.reject("ERR_SUBSCRIBE", result.message, null)
            null -> promise.reject("ERR_SUBSCRIBE", "Subscribe was canceled or failed", null)
          }
        }
      }
    }

    AsyncFunction("consumePurchase") { purchaseToken: String, promise: Promise ->
      runIfPaymentReady(promise) { p ->
        p.consumeProduct(purchaseToken) {
          consumeFailed { promise.reject("ERR_CONSUME", it.message ?: "Consume failed", it) }
          consumeSucceed { promise.resolve(null) }
        }
      }
    }

    AsyncFunction("getPurchasedProducts") { promise: Promise ->
      runIfPaymentReady(promise) { p ->
        p.getPurchasedProducts {
          queryFailed { promise.reject("ERR_QUERY", it.message ?: "Query failed", it) }
          querySucceed { list ->
            val jsonArray = list.joinToString(",", "[", "]") { it.originalJson }
            promise.resolve(purchaseJsonListToMaps(jsonArray))
          }
        }
      }
    }

    AsyncFunction("getSubscribedProducts") { promise: Promise ->
      runIfPaymentReady(promise) { p ->
        p.getSubscribedProducts {
          queryFailed { promise.reject("ERR_QUERY", it.message ?: "Query failed", it) }
          querySucceed { list ->
            val jsonArray = list.joinToString(",", "[", "]") { it.originalJson }
            promise.resolve(purchaseJsonListToMaps(jsonArray))
          }
        }
      }
    }

    AsyncFunction("queryPurchaseProduct") { productId: String, promise: Promise ->
      runIfPaymentReady(promise) { p ->
        p.getPurchasedProducts {
          queryFailed { promise.reject("ERR_QUERY", it.message ?: "Query failed", it) }
          querySucceed { list ->
            val found = list.firstOrNull { it.productId == productId }
            promise.resolve(found?.originalJson?.let { jsonStringToMap(it) })
          }
        }
      }
    }

    AsyncFunction("querySubscribeProduct") { productId: String, promise: Promise ->
      runIfPaymentReady(promise) { p ->
        p.getSubscribedProducts {
          queryFailed { promise.reject("ERR_QUERY", it.message ?: "Query failed", it) }
          querySucceed { list ->
            val found = list.firstOrNull { it.productId == productId }
            promise.resolve(found?.originalJson?.let { jsonStringToMap(it) })
          }
        }
      }
    }

    AsyncFunction("getInAppSkuDetails") { productIds: List<String>, promise: Promise ->
      runIfPaymentReady(promise) { p ->
        p.getInAppSkuDetails(productIds) {
          getSkuDetailsFailed { promise.reject("ERR_SKU", it.message ?: "Get SKU failed", it) }
          getSkuDetailsSucceed { list ->
            val jsonArray = "[" + list.joinToString(",") { skuDetailsToJson(it) } + "]"
            promise.resolve(skuDetailsListToMaps(jsonArray))
          }
        }
      }
    }

    AsyncFunction("getSubscriptionSkuDetails") { productIds: List<String>, promise: Promise ->
      runIfPaymentReady(promise) { p ->
        p.getSubscriptionSkuDetails(productIds) {
          getSkuDetailsFailed { promise.reject("ERR_SKU", it.message ?: "Get SKU failed", it) }
          getSkuDetailsSucceed { list ->
            val jsonArray = "[" + list.joinToString(",") { skuDetailsToJson(it) } + "]"
            promise.resolve(skuDetailsListToMaps(jsonArray))
          }
        }
      }
    }

    AsyncFunction("checkTrialSubscription") { promise: Promise ->
      runIfPaymentReady(promise) { p ->
        p.checkTrialSubscription {
          checkTrialSubscriptionFailed {
            promise.reject("ERR_TRIAL", it.message ?: "Check trial subscription failed", it)
          }
          checkTrialSubscriptionSucceed { info ->
            promise.resolve(
              mapOf(
                "isAvailable" to info.isAvailable,
                "trialPeriodDays" to info.trialPeriodDays
              )
            )
          }
        }
      }
    }
  }

  private fun skuDetailsToJson(sku: ir.cafebazaar.poolakey.entity.SkuDetails): String {
    return JSONObject().apply {
      put("sku", sku.sku)
      put("title", sku.title)
      put("type", sku.type)
      put("price", sku.price)
      put("description", sku.description)
    }.toString()
  }

  private fun runIfPaymentReady(promise: Promise, block: (Payment) -> Unit) {
    val p = payment
    if (p == null || paymentConnection?.getState() != ConnectionState.Connected) {
      promise.reject("ERR_NOT_CONNECTED", "Call connect() first", null)
      return
    }
    block(p)
  }

  companion object {
    private var currentPayment: Payment? = null

    @JvmStatic
    fun getCurrentPayment(): Payment? = currentPayment

    @JvmStatic
    internal fun setCurrentPayment(p: Payment?) {
      currentPayment = p
    }
  }
}
